# 🔗 Deadman-Link

Deadman-Link is a secure, self-destructing short link platform equipped with dynamic redirection routing, automated URL safety scanners, built-in content moderation, and real-time visitor analytics. The platform also features synchronized media **Watch Parties** and a full-featured **Admin Console** for absolute operational control.

---

## 🚀 Key Feature Highlights

### 1. Deadman Link Management
- **Self-Destruction**: Links can expire after a specific time (`expiresAt`) or when they reach a set click limit (`maxClicks`).
- **One-Time Links**: Enforces a strict single-use redirect restriction.
- **Scheduled Access**: Delay activation until a set future date/time.
- **Password Protection**: Restrict link redirects behind a secure pass-gate.
- **Toggleable Previews**: Toggle public preview cards so users can inspect target URLs before being redirected.
- **Visibility Settings**: Publish links as public (community browseable) or private (visible only to the owner).

### 2. Smart Dynamic Redirection Engine
Route visitors to different destination URLs based on dynamic criteria:
- **Device-Based**: Customize redirects for Mobile, Tablet, Desktop, or Search Crawler Bots.
- **Time-Based**: Redirect to alternate URLs during specific hours of the day (24h format).
- **Day-Based**: Route traffic differently depending on whether it is a weekday or weekend.
- **Click-Based**: Change destinations dynamically based on how many clicks a link has already received.

### 3. Integrated Security & Safety Scanner
- **Auto-Scan**: Automatically scans target URLs on creation using basic safety checks (detecting generic malware patterns or low safety metrics).
- **Auto-Moderation**: Validates link content (titles, URLs) against a customizable database of **Banned Keywords**.
- **Instant Mitigation**: Flagged links are automatically set to `blocked` status, creating a high-priority system report immediately.
- **Report Portal**: Public preview screens include reporting mechanisms allowing users to flag links for spam, malware, phishing, or copyright violations.

### 4. Real-Time Analytics & Webhooks
- **Advanced Charts**: Real-time visualization of click timelines, device demographics, and geographical analytics using Recharts.
- **Webhooks**: Deliver post-back events (JSON payloads) on key triggers: `first_click`, `expiry`, and `one_time_complete`. Include signature secret verification.

### 5. Synchronized Watch Parties
- **Watch Rooms**: Users can create or join virtual rooms to watch synchronized videos (e.g., YouTube) together.
- **Real-Time Sync**: Real-time playhead sync (play/pause/seek) and live chat system powered by Socket.io.

### 6. Operational Admin Panel
Admins gain access to a dedicated dashboard suite:
- **Moderation Queue**: Review flagged content with single or bulk actions (Approve, Block, Delete, or Reject reports).
- **User Controls**: Manage user status (Active vs Banned) and roles (`Regular`, `Premium`, `Admin`).
- **System Settings**: Live configuration of banned keywords list, auto-flagging toggles, and system limits.
- **Security Firewall**: Monitor firewall metrics, manually blacklist/whitelist IPs, and scan for suspicious activity.
- **Immutable Audit Logs**: Fully searchable log tracing all moderator and administrator actions for accountability.

---

## 🛠️ Technology Stack

### Frontend (Client)
- **Framework**: React 19 (Vite)
- **Router**: React Router v7
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts (high-fidelity charting)
- **Sockets**: Socket.io-client
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Other**: React QR Code, React YouTube

### Backend (Server)
- **Platform**: Node.js & Express
- **Database**: MongoDB (Mongoose Object Modeling)
- **Real-Time**: Socket.io
- **Auth**: JWT (JSON Web Tokens) & Passport (Google OAuth 2.0 integration)
- **Security**: Rate Limiting (`express-rate-limit`) & IP Blocking firewall

---

## 📁 Project Directory Structure

```text
Deadman-Link-main/
├── server/                 # Express backend server
│   ├── config/             # Passport, database connection setups
│   ├── middleware/         # Rate limiters, IP blocker, audit logger, auth
│   ├── models/             # Mongoose schemas (Link, User, FlagReport, etc.)
│   ├── routes/             # REST endpoints (auth, links, admin, analytics)
│   ├── scripts/            # Admin seeding and migration utilities
│   ├── utils/              # Email sending and background utilities
│   ├── index.js            # Main entry point (starts server and socket.io)
│   └── package.json
│
├── src/                    # Vite + React frontend client
│   ├── assets/             # Images, static resources
│   ├── components/         # Reusable layouts, UI buttons, modals
│   ├── context/            # Auth and Socket state providers
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Routing pages (Landing, Auth, Dashboards, Admin)
│   ├── router/             # React Router v7 route paths
│   ├── services/           # Axios HTTP and WebSocket service setup
│   ├── main.jsx            # Frontend entry point
│   └── index.css           # Global design tokens and Tailwind configuration
│
├── package.json            # Frontend package scripts
└── vite.config.js          # Vite compilation & dev server configuration
```

---

## ⚙️ Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (Local installation or MongoDB Atlas cluster URI)

### 1. Clone & Install Dependencies
Run these commands in your terminal:

```bash
# Clone the repository and enter the folder
cd Deadman-Link-main

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 2. Configure Environment Variables

Create `.env` file in the **root** folder:
```env
## Frontend Configurations (Vite)
# Base API endpoint for the server
VITE_API_URL=http://localhost:5050/api

# The URL of the frontend app (used for generating shortened redirect links)
VITE_APP_URL=http://localhost:5173
```

Create a `.env` file in the **`server`** folder:
```env
# MongoDB Connection String
MONGO_URI=mongodb://127.0.0.1:27017/deadman_link

# JWT Secret used to sign authentication tokens
JWT_SECRET=DeadmanLink2025SecureKey!@$%^&*()_.+

# Server Listening Port
PORT=5050

# Frontend URL (For CORS policies)
FRONTEND_URL=http://localhost:5173

# Email Configurations (Gmail App Password or SMTP)
# If left blank, OTP codes will fall back to printing in the server console.
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Google OAuth Keys (Optional - Leave blank to disable Google Login)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5050/api/auth/google/callback
```

### 3. Initialize & Seed Database
Seed the initial database with standard user roles (`regular`, `premium`, `admin`):
```bash
# From the root directory:
cd server
node scripts/seedAdminUsers.js
```

### 4. Create an Admin Account
To create a custom administrator account or promote an existing account to Admin status:
```bash
# Promote an existing user:
node scripts/createAdmin.js admin@example.com

# Create a brand new admin user:
node scripts/createAdmin.js admin@example.com "Admin Name" "SecurePassword123"
```

### 5. Running the Application
Open two terminal windows to run both frontend and backend concurrently:

**Terminal 1 (Backend Server)**
```bash
cd server
npm start
```
*Server starts running on [http://localhost:5050](http://localhost:5050)*

**Terminal 2 (Frontend Client)**
```bash
npm run dev
```
*Vite compiles and loads the client on [http://localhost:5173](http://localhost:5173)*

---

## 📡 API Routing Overview

### Public & User Auth (`/api/auth`)
- `POST /register/initiate`: Sends verification OTP.
- `POST /register/verify`: Verifies OTP and registers account.
- `POST /login`: Log in via email/password.
- `POST /forgot-password` & `/reset-password`: OTP password reset flow.
- `GET /me`: Returns current user session details.
- `PATCH /update-profile` & `/update-avatar`: Modify profile details.
- `DELETE /delete-account`: Deletes user account and all owned links.
- `GET /google/login`, `/google/register`, `/google/admin`: Google OAuth provider pathways.

### Deadman Link Controls (`/api/links`)
- `GET /public`: Retrieve community feed links.
- `GET /`: Retrieve links created by the current user.
- `POST /`: Create a new shortened link with dynamic routing properties.
- `PUT /:id`: Update link settings (expiry, limits, redirection rules).
- `DELETE /:id`: Delete link.
- `PATCH /:id/favorite`: Toggle favorite marker.

### Analytics Endpoint (`/api/analytics`)
- `GET /summary`: Aggregate stats for user's dashboard charts.

### Synchronized Watch Rooms (`/api/watch`)
- `GET /rooms`: List all active rooms.
- `POST /rooms`: Host a new watch room.
- `GET /rooms/:code`: Retrieve room metadata.

### System Configuration & Scans
- `POST /api/security/scan-url`: Checks target URL against heuristic scanners.
- `POST /api/moderation/report`: Users can submit flag/abuse report for any link.

### Administrator Actions (Require Admin Authentication)
- `GET /api/admin/overview`: System-wide aggregate charts and timeline stats.
- `GET /api/admin/links`: View and search all links in system.
- `GET /api/admin/users`: Search and manage user accounts.
- `PATCH /api/admin/users/:id`: Change roles or Ban/Unban user status.
- `GET /api/admin/audit-logs`: View system activity trail.
- `GET /api/admin/settings` & `PATCH /api/admin/settings`: Manage global configurations (banned keywords).
- `GET /api/admin/security/blocked-ips`: Manage firewall IP blocks.

---

## 🗃️ Database Models Overview

*   **User**: Handles customer credentials, OAuth metadata, roles, and profiles.
*   **AdminUser**: Legacy collection syncing user roles and states inside the Admin UI.
*   **Link**: Heart of the system; houses slugs, expiry rules, passwords, analytics aggregates, webhook targets, and nested redirection subschemas.
*   **AnalyticsEvent**: Stores atomic redirect logs containing timestamp, IP Address, browser User-Agent, Device category, and Country code.
*   **FlagReport**: Houses user and auto-flagged abuse reports, review status, and moderation notes.
*   **WatchRoom**: Holds room codes, live status indicators, host names, and active video streaming assets.
*   **AuditLog**: Maintains immutable histories of admin interactions (IP, action, admin, target).
*   **OTP**: Short-lived verification tokens for email logins/resets.
*   **SystemSettings**: Holds global parameters, including banned terms lists and feature flags.

---

## 🔒 Security Measures
1. **Firewall Middleware**: IP Blocker checks incoming connections against blacklisted IPs and rejects traffic early.
2. **Rate Limiting**: Custom rate limiting windows applied strategically across authentication, link generation, and public redirections.
3. **Audit Trails**: Immutable logs for sensitive administrative actions.
4. **Input Sanitization & Validation**: Validation of URLs and text inputs prior to DB insertion.
