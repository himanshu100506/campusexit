# CampusExit: Student Outing & Gate Management

React (Vite) + Node/Express + MySQL.

## Roles
- **Student**: signs in with college Google account, completes profile once, applies for gate pass, sees history with status.
- **Warden**: sees requests for their hostel, approves or rejects (with remarks).
- **Gate staff**: marks students out and back in. Late returns are logged as violations by a trigger.

Role is decided by email: emails in `warden` / `gate_staff` tables get those roles, every other college email is a student.

## Setup

### 1. Database
```
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```
Edit the two dev staff emails at the bottom of `seed.sql` (or INSERT your own warden / gate_staff rows).

### 2. Backend
```
cd backend
cp .env.example .env     # fill DB_PASSWORD, JWT_SECRET, GOOGLE_CLIENT_ID
npm install
npm run dev
```

### 3. Frontend
```
cd frontend
cp .env.example .env     # VITE_GOOGLE_CLIENT_ID = same Web client ID
npm install
npm run dev
```
Open http://localhost:5173.

### Google sign-in
Google Cloud Console -> APIs & Services -> Credentials -> Create OAuth client ID (Web).
Add `http://localhost:5173` under Authorized JavaScript origins. Put the client ID in both `.env` files.
Without a client ID and with `DEV_AUTH=true`, the login page shows an email-only test login.
Set `DEV_AUTH=false` before any real deployment.

## Where the DBMS concepts are (for the viva)
| Concept | Where |
|---|---|
| 3NF lookups (hostel, room, course, reason_category) | `schema.sql` tables |
| Triggers | `trg_pass_before_insert` (one live pass, room required, no past dates), `trg_log_after_update` (auto LATE_RETURN violation) |
| Stored procedures + transactions | `sp_review_pass`, `sp_mark_out`, `sp_mark_in` (row locks with `FOR UPDATE`) |
| Views | `v_pass_details`, `v_students_out`, `v_pending_requests`, `v_late_report` |
| Constraints | CHECK (dates, semester), UNIQUE, FKs, ENUM status |
