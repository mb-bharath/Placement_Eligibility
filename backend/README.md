# Placement Eligibility Backend

This backend matches the React Native frontend API calls in `frontend/src`.

## Quick Start

```bash
cd backend
npm install
npm start
```

By default the server runs on `http://localhost:5000` and serves API routes under `/api`.

## Environment

Copy `backend/.env.example` to `backend/.env` and adjust as needed:

```
PORT=5000
JWT_SECRET=change_me_in_production
ADMIN_EMAIL=admin@bitsathy.ac.in
ADMIN_PASSWORD=change_me
ADMIN_NAME=Placement Admin
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-host>/<db>?retryWrites=true&w=majority
MONGODB_DB=placement_app
```

## Viewing registered users (admin)

- Get an admin token by logging in with `POST /api/auth/login`.
- Then open `GET /api/admin/users?token=<JWT>` (or send `Authorization: Bearer <JWT>`).

Admin login is restricted to the single account configured via `ADMIN_EMAIL` + `ADMIN_PASSWORD`.
