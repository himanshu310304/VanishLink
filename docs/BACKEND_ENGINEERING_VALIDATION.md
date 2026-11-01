# VanishLink Backend Engineering Validation & Reliability Report

**Platform:** VanishLink (Controlled URL-Sharing & Redirection Platform)  
**Author:** Backend & Performance Engineering  
**Validation Date:** November 2026  
**Git Branch:** `validation-and-hardening`  
**Test Suite Status:** 44 Passing / 0 Failing (100% Pass Rate across 5 Jest Suites)  

---

## Executive Summary

This report provides an empirical, defensible engineering audit of the **VanishLink** backend architecture. Using isolated local benchmarking, automated regression test suites, MongoDB query execution profiling (`explain()`), and concurrent stress testing, we identified critical race conditions, database bottlenecks, and security vulnerabilities in the original codebase, implemented atomic fixes, and validated all improvements with reproducible data.

Key achievements:
1. **Eliminated Critical Concurrency Vulnerability:** Replaced a non-atomic Read-Modify-Write pattern with MongoDB atomic conditional updates (`findOneAndUpdate`), completely preventing access limit bypasses on one-time and click-limited links and eliminating Mongoose `VersionError` crashes (which previously caused up to 94% HTTP 500 error spikes under concurrency).
2. **Built Automated Test & CI Pipeline:** Authored 44 automated Jest/Supertest tests covering link lifecycle, RBAC, JWT authentication, OTP verification, Socket.IO real-time events, and security boundaries. Created GitHub Actions CI workflow (`.github/workflows/backend-ci.yml`).
3. **Optimized Database Indexes:** Diagnosed full collection scans (`COLLSCAN`) examining over 132,000 documents per query on unindexed foreign keys. Added compound indexes (`{ ownerEmail: 1, createdAt: -1 }` and `{ link: 1, createdAt: -1 }`), reducing scanned documents by **332x** and dropping query latency from **25 ms to 1 ms** (96% latency reduction).
4. **Benchmarked Real Throughput:** Quantified backend capacity using `autocannon` at 10, 25, and 50 concurrent connections, achieving **3,679 requests/second** with **2.24 ms average latency** and **0% error rate** on database-backed redirects.
5. **Hardened Security:** Patched sensitive link password leakage in `GET /api/links/public`, blocked unauthenticated Socket.IO room eavesdropping, prevented OTP brute-force attacks with automatic lockout after 5 failed attempts, and restricted link creation to safe protocols (`http:`, `https:`).

---

## 1. Architecture & Request Flow

### Request Lifecycle
```
[Client / Browser]
        │
        ▼ (HTTP / WebSocket)
[Express 5 Middleware Pipeline]
  ├─ CORS (Allowed Origins)
  ├─ express.json & urlencoded (10mb limit)
  ├─ ipBlocker (In-memory Set/Map; whitelists localhost)
  ├─ generalLimiter / redirectLimiter (express-rate-limit; anti-bot)
  └─ detectDirectAccessAttempt (Zero-trust leak detector)
        │
        ├──► /r/:slug (Redirect Engine)
        │       ├─ Find Link metadata
        │       ├─ Check Schedule (scheduleStart)
        │       ├─ Check Expiry (expiresAt)
        │       ├─ Atomic Conditional Increment (clicks < limit)
        │       ├─ Emit Real-time Socket Events (admin_new_click, user_new_click)
        │       ├─ Asynchronous Analytics Logging (AnalyticsEvent)
        │       ├─ Webhook Dispatch (first_click, expired)
        │       └─ Serve Preview Screen or Cloaked Target (iframe)
        │
        ├──► /api/auth (JWT, Bcrypt, OTP Register/Reset)
        ├──► /api/links (Link CRUD, Ownership Check, Safety Scanner)
        ├──► /api/admin/* (RBAC: requireAdmin Middleware)
        └──► Socket.IO Server (Room-based Live Notification System)
```

### Component Analysis: Documented vs Actual Implementation

| Component / Feature | README / Report Claim | Actual Implementation Status | Technical Reality |
| :--- | :--- | :--- | :--- |
| **Self-Destructing Links** | Time & Click Expiry | **Fully Implemented & Hardened** | Atomic conditional update prevents race condition bypass. |
| **One-Time Links** | Strict single-use redirect | **Fully Implemented & Hardened** | Verified under 2, 5, 10, 20, 50 concurrent requests. |
| **Dynamic Routing** | Device, Time, Day, Clicks | **Fully Implemented** | `chooseConditionalTarget` resolves destination based on UA and current date/time. |
| **Zero-Trust Invitations**| Recipient & Device Bound | **Fully Implemented** | `/api/zero-trust` and `requireZeroTrust` enforce invitation tokens. |
| **Real-time Analytics** | Socket.IO Live Events | **Fully Implemented & Secured** | Broadcasts `admin_new_click` and authenticated `user_new_click`. |
| **Watch Rooms (Sync)** | Synchronized Watch Parties | **Partially Implemented** | Schema exists in `WatchRoom.js`, but socket sync (play/pause/seek) is not wired in backend. |
| **Redis Caching / Queue** | Redis IP blocking & Queues | **Not Implemented** | Redis is not used in application code; all rate-limiting and IP tracking use Node.js memory. |
| **BullMQ Worker Queue** | Webhook Worker Queue | **Not Implemented** | Webhooks are dispatched via inline HTTP requests (`http.request`/`https.request`). |
| **Docker / Containers** | Containerized Deployment | **Not Implemented** | No Dockerfile or compose files present in repository. |
| **Automated Tests / CI** | Not Present Initially | **Now Fully Implemented** | 44 Jest/Supertest tests and GitHub Actions CI workflow added. |

---

## 2. Concurrency & Race Condition Investigation

### The Vulnerability: Read-Modify-Write Race Condition

Prior to our fix, the redirection endpoint at `/r/:slug` enforced click limits using standard Mongoose document operations:

```javascript
// UNPATCHED VULNERABLE LOGIC:
const link = await Link.findOne({ slug: req.params.slug });
...
const limit = link.isOneTime ? 1 : link.maxClicks || 0;
if (limit > 0 && link.clicks >= limit) {
  return res.status(410).send('VanishLink: Click limit reached');
}

const nextClicks = link.clicks + 1;
link.clicks = nextClicks;
await link.save(); // <-- THREW Mongoose VersionError UNDER CONCURRENCY
```

### Flaws Identified
1. **Time-of-Check to Time-of-Use (TOCTOU):** When $N$ concurrent requests arrived simultaneously, all $N$ read `link.clicks = 0` concurrently before any request had saved. Thus, all $N$ requests passed the `link.clicks >= limit` check.
2. **Access Limit Bypass on Multi-Click Links:** When testing a link with `maxClicks: 3` under 10 concurrent requests, **4 requests succeeded simultaneously**, exceeding the creator's explicit access allowance.
3. **Mongoose VersionError & 500 Outages:** Mongoose uses internal document versioning (`__v`). When multiple concurrent requests attempted to execute `link.save()` on the same document version, the second and subsequent saves conflicted:
   ```text
   VersionError: No matching document found for id "..." version 0
   at model.save (server/node_modules/mongoose/lib/model.js:595:28)
   ```
   Because the route controller did not handle optimistic locking errors, the unhandled `VersionError` caused Express to crash the request and return **HTTP 500 Internal Server Error** to end users. Under 50 concurrent requests, **up to 94% of visitors received 500 errors**.

### The Solution: Atomic Conditional Increment

We replaced the non-atomic read-modify-write pattern with a single atomic MongoDB update filter:

```javascript
// ATOMIC HARDENED IMPLEMENTATION:
const limit = link.isOneTime ? 1 : (link.maxClicks || 0);

let updatedLink;
if (limit > 0) {
  updatedLink = await Link.findOneAndUpdate(
    {
      _id: link._id,
      clicks: { $lt: limit } // ATOMIC FILTER: Only matches if clicks are strictly under limit
    },
    {
      $inc: { clicks: 1 }   // ATOMIC INCREMENT on MongoDB primary node
    },
    { new: true }
  );

  if (!updatedLink) {
    // Another concurrent request reached the limit first
    await Link.updateOne(
      { _id: link._id, status: { $ne: 'expired' } },
      { $set: { status: 'expired' } }
    );
    return res.status(410).send('VanishLink: Click limit reached');
  }
} else {
  // Unlimited link
  updatedLink = await Link.findOneAndUpdate(
    { _id: link._id },
    { $inc: { clicks: 1 } },
    { new: true }
  );
}
```

### Empirical Concurrency Test Results: Before vs After

We executed identical isolated concurrency experiments across 15 fresh one-time links (`isOneTime: true`, `maxClicks: 1`) using `Promise.all` across 5 concurrency levels ($C \in \{2, 5, 10, 20, 50\}$).

Raw evidence files:
- Baseline: `evidence/concurrency_baseline.json`
- Patched: `evidence/concurrency_patched.json`

| Concurrency Level ($C$) | Trial | Total Attempted | Baseline: 200 OK | Baseline: 410 Gone | Baseline: 500 VersionErrors | Baseline Clean Rejection | Patched: 200 OK | Patched: 410 Gone | Patched: 500 VersionErrors | Patched Clean Rejection |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **2** | 1 | 2 | 1 | 0 | **1 (50%)** | ❌ FAIL | **1** | **1** | **0** | **✅ PASS** |
| **2** | 2 | 2 | 1 | 0 | **1 (50%)** | ❌ FAIL | **1** | **1** | **0** | **✅ PASS** |
| **2** | 3 | 2 | 1 | 0 | **1 (50%)** | ❌ FAIL | **1** | **1** | **0** | **✅ PASS** |
| **5** | 1 | 5 | 1 | 3 | **1 (20%)** | ❌ FAIL | **1** | **4** | **0** | **✅ PASS** |
| **5** | 2 | 5 | 1 | 1 | **3 (60%)** | ❌ FAIL | **1** | **4** | **0** | **✅ PASS** |
| **5** | 3 | 5 | 1 | 2 | **2 (40%)** | ❌ FAIL | **1** | **4** | **0** | **✅ PASS** |
| **10** | 1 | 10 | 1 | 5 | **4 (40%)** | ❌ FAIL | **1** | **9** | **0** | **✅ PASS** |
| **10** | 2 | 10 | 1 | 2 | **7 (70%)** | ❌ FAIL | **1** | **9** | **0** | **✅ PASS** |
| **10** | 3 | 10 | 1 | 1 | **8 (80%)** | ❌ FAIL | **1** | **9** | **0** | **✅ PASS** |
| **20** | 1 | 20 | 1 | 11 | **8 (40%)** | ❌ FAIL | **1** | **19** | **0** | **✅ PASS** |
| **20** | 2 | 20 | 1 | 10 | **9 (45%)** | ❌ FAIL | **1** | **19** | **0** | **✅ PASS** |
| **20** | 3 | 20 | 1 | 1 | **18 (90%)** | ❌ FAIL | **1** | **19** | **0** | **✅ PASS** |
| **50** | 1 | 50 | 1 | 30 | **19 (38%)** | ❌ FAIL | **1** | **49** | **0** | **✅ PASS** |
| **50** | 2 | 50 | 1 | 26 | **23 (46%)** | ❌ FAIL | **1** | **49** | **0** | **✅ PASS** |
| **50** | 3 | 50 | 1 | 2 | **47 (94%)** | ❌ FAIL | **1** | **49** | **0** | **✅ PASS** |

### Result Analysis
- **Pre-Fix:** In 100% of baseline trials, concurrent requests generated HTTP 500 server crashes due to Mongoose `VersionError`. At $C=50$, up to 47 out of 50 requests failed with 500 errors.
- **Post-Fix:** In 100% of trials across all concurrency tiers, **exactly 1 request** gained access (HTTP 200 OK), **exactly $C-1$ requests** received a clean HTTP 410 Gone ("VanishLink: Click limit reached"), **zero 500 errors occurred**, and final stored clicks in MongoDB remained exactly 1.

---

## 3. Automated Backend API Test Suite

The project initially lacked automated tests. We introduced a comprehensive test suite using **Jest 30** and **Supertest 7**, organized into 5 test files:

```text
server/tests/
├── concurrency.test.js       # Race condition regression test suite (4 tests)
├── api_links.test.js         # Link CRUD, slugs, limits, previews (13 tests)
├── api_auth_security.test.js # JWT, Login, OTP, RBAC, BOLA/IDOR (19 tests)
├── socketio.test.js          # Live analytics broadcast & room auth (4 tests)
└── security.test.js          # Password leakage, protocols, brute force (4 tests)
```

### Test Coverage Summary

```bash
$ npm test

PASS tests/security.test.js
PASS tests/api_auth_security.test.js
PASS tests/socketio.test.js
PASS tests/concurrency.test.js
PASS tests/api_links.test.js

Test Suites: 5 passed, 5 total
Tests:       44 passed, 44 total
Snapshots:   0 total
Time:        1.898 s
```

### Verified API Test Scenarios
1. **Link Management:**
   - Valid link creation with auto-generated slug (201 Created).
   - Missing destination URL rejection (400 Bad Request).
   - Custom slug collision prevention (409 Conflict).
   - Single-use link expiry enforcement upon access (200 then 410).
   - Click-limited link enforcement at threshold (410).
   - Scheduled activation delay (`scheduleStart` in future returns 403).
   - Expired link rejection (`expiresAt` in past returns 410).
   - Password-protected metadata preservation.
   - Preview card vs iframe conditional rendering based on `?confirm=1`.
   - Updating link properties with owner validation (200).
   - Deleting link with owner validation (200).
   - Nonexistent link slug handling (404 Not Found).
2. **Authentication & Authorization (RBAC):**
   - Missing Bearer token rejection (401 Missing token).
   - Malformed/tampered JWT rejection (401 Invalid token).
   - Expired JWT rejection (401 Invalid token).
   - Valid JWT identity extraction (200).
   - Login credential matching with Bcrypt (200 vs 401).
   - Short password (< 6 characters) rejection during registration (400).
   - 6-digit OTP generation, persistence, and verification flow.
   - Non-admin user hitting `/api/admin/links` or `/api/admin/users` blocked (403 Forbidden).
   - Admin user accessing `/api/admin/links` authorized (200 OK).
3. **Broken Object Level Authorization (BOLA / IDOR):**
   - User B attempting to `PUT /api/links/:id` owned by User A blocked (403 Forbidden).
   - User B attempting to `DELETE /api/links/:id` owned by User A blocked (403 Forbidden).
   - User B attempting to `PATCH /api/links/:id/favorite` owned by User A blocked (403 Forbidden).
4. **Real-time Socket.IO:**
   - WebSocket client connection lifecycle.
   - Global `admin_new_click` broadcast on link click.
   - Room-scoped `user_new_click` broadcast delivered to link owner.
   - Security verification: unauthenticated room subscription rejected with `auth_error`.

---

## 4. Performance & Scalability Benchmarking

### Benchmark Environment
- **Operating System:** macOS Darwin 25.6.0 (arm64)
- **CPU:** Apple M4 (10 cores)
- **System Memory:** 16 GB unified RAM
- **Node.js Runtime:** v26.5.0
- **Database:** MongoDB Community Edition v8.3.3 (Local instance: 127.0.0.1:27017)
- **Redis:** Not used in application
- **Benchmark Tool:** `autocannon` v8.0.0
- **Target Endpoint:** `http://localhost:5055/r/benchmark-link` (provisioned reusable link with unlimited clicks, pointing to clean destination)
- **Baseline Framework Overhead Endpoint:** `http://localhost:5055/api/health`

### Measured Load Benchmark Results

Raw evidence files:
- `evidence/benchmark_c10.json`
- `evidence/benchmark_c25.json`
- `evidence/benchmark_c50.json`
- `evidence/benchmark_health_c25.json`
- Summary: `evidence/benchmark_summary.json`

| Benchmark Target | Virtual Clients ($C$) | Duration | Total Requests | Req / Sec (Avg) | Req / Sec (Max) | Latency (Avg) | Median (p50) | p90 | p97.5 | p99 | Max Latency | Error Rate | Throughput |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Redirect Engine (`/r/:slug`)** | 10 | 11.01 s | 39,626 | **3,603 req/s** | 3,736 req/s | **2.24 ms** | 2 ms | 3 ms | 4 ms | 5 ms | 18 ms | **0.00%** | 3.52 MB/s |
| **Redirect Engine (`/r/:slug`)** | 25 | 11.01 s | 40,466 | **3,679 req/s** | 3,750 req/s | **6.29 ms** | 6 ms | 7 ms | 8 ms | 10 ms | 15 ms | **0.00%** | 3.60 MB/s |
| **Redirect Engine (`/r/:slug`)** | 50 | 10.01 s | 32,551 | **3,256 req/s** | 3,529 req/s | **14.86 ms** | 14 ms | 18 ms | 24 ms | 31 ms | 81 ms | **0.00%** | 3.19 MB/s |
| **Health Check (`/api/health`)** | 25 | 5.01 s | 270,708 | **54,134 req/s** | 54,580 req/s | **0.01 ms** | 0 ms | 0 ms | 0 ms | 0 ms | 5 ms | **0.00%** | 18.33 MB/s |

### Latency vs Concurrency Scaling
```text
Concurrency Level    Avg Latency (ms)    p99 Latency (ms)    Throughput (req/s)
─────────────────────────────────────────────────────────────────────────────
10 clients                 2.24 ms             5.0 ms            3,603 req/s
25 clients                 6.29 ms            10.0 ms            3,679 req/s
50 clients                14.86 ms            31.0 ms            3,256 req/s
```

### Analysis & Local Limitations
- **Peak Throughput:** The redirect engine sustained **3,679 req/sec** on a single Node.js process with zero HTTP errors and 100% 2xx responses.
- **Latency Distribution:** Under 25 concurrent connections, 99% of all requests completed within 10 ms. At 50 connections, p99 latency scaled gracefully to 31 ms.
- **Resource Constraints:** In this test, Node.js and MongoDB shared the same Apple M4 host. In production, network round-trip time (RTT), database replica set write concerns (`w: "majority"`), connection pooling, and SSL/TLS termination will introduce additional baseline latency.

---

## 5. Database Performance & Index Profiling

### Query Audit Findings

We analyzed the query patterns in `server/routes/analyticsRoutes.js` and `server/index.js` against the existing MongoDB index definitions:

1. **Dashboard Links Query:**
   `Link.find({ ownerEmail: targetEmail }).sort({ createdAt: -1 })`
   - *Previous state:* `links` collection only had `_id_` and `slug_1`.
   - *Result:* **Full Collection Scan (`COLLSCAN`)** followed by an in-memory **`SORT` stage**, which would crash or exhaust memory on large collections.
2. **Analytics Dashboard Query:**
   `AnalyticsEvent.find({ link: { $in: targetLinkIds }, createdAt: { $gte: sevenDaysDate } })`
   - *Previous state:* `analyticsevents` collection had only `_id_`.
   - *Result:* **Full Collection Scan (`COLLSCAN`)** examining every recorded click across all platform users.

### Empirical MongoDB `explain("executionStats")` Comparison

We seeded a test collection with **10,099 links** and **132,823 analytics events** to measure query execution statistics under identical conditions before and after adding targeted compound indexes.

Raw evidence file: `evidence/database_index_analysis.json`

#### Query 1: User Links by Owner (`ownerEmail` + `createdAt` sort)
```javascript
db.links.find({ ownerEmail: "bench-owner@example.com" }).sort({ createdAt: -1 })
```
- **Before Optimization (No Index):**
  - Execution Stage: `SORT` over `COLLSCAN`
  - Total Documents Examined: **10,099**
  - Total Keys Examined: **0**
  - Documents Returned: **100**
  - Execution Time: **4 ms** (with in-memory sorting)
- **After Optimization (Compound Index: `{ ownerEmail: 1, createdAt: -1 }`):**
  - Execution Stage: `FETCH` over `IXSCAN`
  - Total Documents Examined: **100**
  - Total Keys Examined: **100**
  - Documents Returned: **100**
  - Execution Time: **1 ms**
  - **Improvement:** **100x reduction** in documents examined; eliminated in-memory sorting completely.

#### Query 2: Analytics Events Aggregation (`link` + `createdAt`)
```javascript
db.analyticsevents.find({ link: { $in: targetLinkIds }, createdAt: { $gte: sevenDaysDate } })
```
- **Before Optimization (No Index):**
  - Execution Stage: `COLLSCAN`
  - Total Documents Examined: **132,823**
  - Total Keys Examined: **0**
  - Documents Returned: **400**
  - Execution Time: **25 ms**
- **After Optimization (Compound Index: `{ link: 1, createdAt: -1 }`):**
  - Execution Stage: `FETCH` over `IXSCAN`
  - Total Documents Examined: **400**
  - Total Keys Examined: **401**
  - Documents Returned: **400**
  - Execution Time: **1 ms**
  - **Improvement:** **332x reduction** in documents examined (from 132,823 to 400); **96% reduction in query latency** (from 25 ms to 1 ms).

### Permanent Schema Updates
The indexes were codified into Mongoose models:
- In `server/models/Link.js`:
  ```javascript
  linkSchema.index({ ownerEmail: 1, createdAt: -1 });
  linkSchema.index({ visibility: 1, createdAt: -1 });
  ```
- In `server/models/AnalyticsEvent.js`:
  ```javascript
  analyticsEventSchema.index({ link: 1, createdAt: -1 });
  analyticsEventSchema.index({ slug: 1, createdAt: -1 });
  ```

---

## 6. Security Audit & Hardening

| Vulnerability | Severity | Impact | Reproduction | Fix Implemented | Verification Test |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Plaintext Password Exposure** (`/api/links/public`) | **High** | Any logged-in user calling `GET /api/links/public` received plaintext passwords for all protected links. | Inspected `.select('... password ...')` response payload. | Removed `password` from projection; filtered by `visibility: 'public'`. | `tests/security.test.js` |
| **Private Link Enumeration** (`/api/links/public`) | **High** | `GET /api/links/public` queried `Link.find({})`, exposing links marked `visibility: 'private'`. | Queried public endpoint with private links in database. | Added `{ visibility: 'public', status: { $ne: 'blocked' } }` query filter. | `tests/security.test.js` |
| **Unauthenticated Socket.IO Room Eavesdropping** | **High** | Any WebSocket client could emit `join-user-room` with an arbitrary `userId` and receive victim click analytics. | Emitted event with arbitrary victim ObjectId with no auth credentials. | Required JWT token validation; verified `decoded.sub === targetUserId \|\| role === 'admin'`. | `tests/socketio.test.js` |
| **OTP Brute-Force Weakness** | **Medium** | 6-digit OTP codes had no failed attempt counter; vulnerable to brute force within 10-minute window. | Scripted successive invalid code verifications. | Added `attempts` counter to `OTPSchema`. Automatically invalidates and deletes OTP after 5 failed tries (HTTP 429). | `tests/security.test.js` |
| **Dangerous URL Protocol Injection (XSS)** | **Medium** | Link creation accepted `javascript:`, `data:`, and `vbscript:` schemes. | Created link with `targetUrl: 'javascript:alert(1)'`. | Enforced strict protocol validation requiring `parsedUrl.protocol === 'http:' \|\| 'https:'`. | `tests/security.test.js` |
| **OTP Console Token Leakage** | **Low** | `devCode` was included in JSON responses when email was not configured. | Checked initiate registration response payload. | Restricted `devCode` return to `process.env.NODE_ENV !== 'production'`. | `server/routes/authRoutes.js` |

---

## 7. Evidence & Reproduction Commands

All test and benchmark outputs have been preserved in the `evidence/` directory.

### Commands to Reproduce Locally

1. **Start MongoDB:**
   ```bash
   mongod --config /opt/homebrew/etc/mongod.conf
   ```

2. **Run Full Automated Test Suite (44 Tests):**
   ```bash
   cd server
   npm test
   ```

3. **Run 15-Trial Concurrency Experiment:**
   ```bash
   NODE_PATH=./server/node_modules node server/tests/concurrency_experiment.js evidence/concurrency_patched.json
   ```

4. **Run Database Index Explain Benchmark:**
   ```bash
   NODE_PATH=./server/node_modules node server/scripts/db_index_benchmark.js
   ```

5. **Run Load Benchmark (Autocannon):**
   ```bash
   # Terminal 1: Start Server
   PORT=5055 MONGO_URI=mongodb://127.0.0.1:27017/vanishlink_test node server/index.js

   # Terminal 2: Run 25-connection load benchmark
   ./server/node_modules/.bin/autocannon -c 25 -d 10 -j http://localhost:5055/r/benchmark-link
   ```

---

## 8. Limitations & Future Hardening Recommendations

1. **Distributed State & In-Memory Limitations:**
   Current rate limiters (`express-rate-limit`) and IP blocking (`ipBlocker.js`) maintain state in Node.js process memory (`Set` and `Map`). If the backend scales horizontally across multiple container instances or worker processes behind a load balancer, each instance will maintain isolated counts.
   - *Recommendation:* Introduce Redis-backed stores (`rate-limit-redis`, Redis sets) for cross-node synchronization.
2. **Synchronized Video Watch Party:**
   `WatchRoom.js` provides schema definitions, but playhead synchronization (play/pause/seek events) is not currently implemented in the Socket.IO server.
3. **Database Write Concern in Production Clusters:**
   Local benchmarks utilized standalone MongoDB with default write concern. In a production multi-region replica set, configuring `{ writeConcern: { w: 'majority' } }` on atomic increments will ensure cluster-wide durability at the cost of slight network RTT overhead.

