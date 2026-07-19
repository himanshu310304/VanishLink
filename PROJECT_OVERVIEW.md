# VanishLink - Project Overview & Interview Guide

This document provides a comprehensive breakdown of the VanishLink project. It is designed to explain the core concept, the problems it solves, its advantages and disadvantages, and includes a dedicated section for technical interviews to help you explain the project to recruiters or engineering managers.

---

## 1. What is this project?
**VanishLink** is a highly secure, time-sensitive URL sharing and secret management platform. It allows users to create encrypted links that only become active under specific conditions (like a timer) or self-destruct after being viewed or after a certain time expires.

It acts as a digital "Dead Man's Switch" for data: if the creator doesn't intervene, or if a timer runs out, the data is automatically released, destroyed, or locked behind a password.

## 2. What does it do?
The core functionality of the platform includes:
- **Scheduled Links:** Links that remain dormant and only become accessible at a specific date and time in the future.
- **Self-Destructing Links (Burn after reading):** Links that automatically delete themselves permanently from the database the moment they are viewed.
- **Password-Protected Payloads:** Adding an encrypted layer to the link, requiring the recipient to have a password to view the destination.
- **Analytics & Tracking:** Tracking how many times a link was clicked, where the clicks came from, and reporting unauthorized access attempts.
- **Robust Admin Dashboard:** A complete administrative suite to monitor users, moderate reported links, block malicious IP addresses, and manage rate limiting rules dynamically.

---

## 3. What problems does it solve?
In the modern digital age, sharing sensitive information (passwords, API keys, private documents, whistleblowing data) over standard messaging apps or email is inherently insecure. 

**VanishLink solves:**
1. **The "Forever Data" Problem:** Messages in Slack or Email live forever. If an account is hacked years later, old secrets are exposed. VanishLink links guarantee the data is deleted from the universe after it is read.
2. **Unauthorized Forwarding:** If you send a sensitive link to a contractor, they could forward it to someone else. With single-view self-destructing links, if a second person clicks it, the data is already gone.
3. **Future Information Release:** If a user wants to ensure data (like a will, a press release, or a timed announcement) is only accessible *after* a specific time, regardless of whether the user is online to send it.

---

## 4. Pros and Cons

### Pros (Advantages)
- **High Security:** Passwords and secrets are never stored in plain text. Links vanish without a trace once their condition is met.
- **Defense in Depth:** Built-in IP blocking, brute-force rate limiters, and JWT authentication ensure the API is hardened against bots and attackers.
- **Decoupled Architecture:** Using React for the frontend and Express/Node.js for the backend means the platform is highly scalable and mobile-app ready.
- **Dynamic Configuration:** Admins can change rate limits and security thresholds live from the dashboard without needing to restart the server.

### Cons (Disadvantages/Trade-offs)
- **No Account Recovery for Secrets:** If a user loses the password to a specific link, the data cannot be recovered, not even by the database administrator.
- **Statefulness in Security:** Currently, the IP Blocker uses in-memory tracking (RAM). If the server crashes and restarts, the active block list is wiped clean. (This is a trade-off for blazing fast performance).
- **Reliance on Central Server:** It is not currently decentralized (like Blockchain), meaning users must trust the central server to properly execute the destruction of the data.

---

## 5. Interview Guide: How to talk about this project

If you are discussing this project in a software engineering interview, here are the key talking points, architectural decisions, and potential questions you might be asked.

### Key Technical Achievements to Highlight
* **"I built a custom Security & IP Blocking Middleware."** 
  Explain how you didn't just rely on basic packages, but built a custom middleware (`ipBlocker.js`) that tracks request frequency per IP using an in-memory `Map`, and completely blocks malicious traffic before it ever hits the database.
* **"I implemented Dynamic Rate Limiting."** 
  Explain how your `rateLimiter.js` isn't hardcoded. It fetches limits (like 20 auth attempts / 15 mins) directly from MongoDB, allowing admins to throttle traffic live from a React dashboard during an attack.
* **"I separated concerns using a RESTful Architecture."** 
  Explain your folder structure. You used a classic MVC-style backend (Models, Routes, Middleware) and connected it to a component-based React frontend using Axios.

### Common Interview Questions & How to Answer Them

**Q1: How do you handle database optimization when deleting expired links?**
*Answer:* "Instead of running an expensive CRON job that loops through thousands of records every minute to delete expired links, I rely on MongoDB's TTL (Time-To-Live) indexes. When a link is created with an expiration, MongoDB automatically purges the document at the database level the exact second it expires, costing zero CPU overhead on my Node server."

**Q2: What happens if your server restarts? Don't you lose your blocked IPs?**
*Answer:* "Yes, currently the `blockedIPs` Set is held in RAM for maximum speed. For a production scale-up, my next architectural step is to implement **Redis**. I would use Redis as a fast, in-memory caching layer to store the blocked IPs and rate limit counts. This way, if the Node server restarts, or if I spin up 5 different Node servers behind a load balancer, they all share the same Redis block list."

**Q3: How do you secure the Admin Dashboard?**
*Answer:* "I implemented Role-Based Access Control (RBAC). When a user logs in, the backend issues a JWT (JSON Web Token). The payload of this token contains their role (`user` vs `admin`). Every request to an `/api/admin/*` route passes through an `AdminRoute` middleware that strictly verifies the JWT signature and checks if the role is exactly 'admin'. Furthermore, the React frontend also has Protected Routes that kick non-admins back to the homepage."

**Q4: How did you solve the problem of the React Router catching backend API requests?**
*Answer:* "I kept a strict separation of paths. The Express backend serves API requests exclusively under the `/api/` prefix. The React router handles everything else. For the dynamic link redirecter (e.g., `vanishlink.com/my-secret`), I put a catch-all route `/:slug` at the very bottom of my React Router. It reads the slug, pings the backend `GET /api/links/:slug`, and if the link is valid, redirects the user."
