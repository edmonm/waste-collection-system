# Community Waste Collection

A community waste collection platform with separate superadmin, residency admin, and resident experiences, including schedules, service requests, and optional SMS notifications.

## Stack

- React, Vite, JavaScript, and Tailwind CSS
- Node.js and Express REST API returning JSON
- MongoDB with Mongoose
- Optional Twilio SMS delivery

## Requirements

- Node.js 20.19+ or 22.12+
- MongoDB running locally or a MongoDB connection URI

## Run locally

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set `MONGODB_URI`, a long random `JWT_SECRET`, and the `SUPERADMIN_*` account values.
3. Start MongoDB.
4. Create the first superadmin: `npm run seed:superadmin`
5. Start the API and Vite development server: `npm run dev`
6. Open <http://localhost:5173>.

The API runs at <http://localhost:3000/api>. Without Twilio credentials, schedule and request workflows still work; the dashboard reports that SMS delivery is not configured.

## User roles and onboarding

The landing page has separate sign-in choices for **Resident**, **Admin**, and **Superadmin**. The API verifies the selected type against the account role.

- **Superadmin:** Create the initial account by setting `SUPERADMIN_NAME`, `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD` (8-72 characters), and `SUPERADMIN_PHONE` in `.env`, then run `npm run seed:superadmin`. Superadmins create and deactivate residencies, create admin accounts, reassign accounts, and oversee schedules and requests across residencies.
- **Admin:** A superadmin creates an admin account and assigns it to a residency. Admins create and manage residents and handle schedules and service requests only for their assigned residency.
- **Resident:** Residents register using the Resident option and select their residency. They can view that residency's schedules and submit collection requests.

Public registration only creates resident accounts. A legacy admin created with `npm run seed:admin` must be assigned to a residency by a superadmin before it can sign in.

## Project flow

1. Visitors register as residents or sign in through the matching role-specific option.
2. Accounts are stored in MongoDB; successful login issues a signed JWT.
3. The role and residency select the available dashboard and API scope.
4. Admins publish schedules for their assigned residency; superadmins can publish for any residency. SMS broadcasts target residents in that schedule's residency when Twilio is configured.
5. Residents view their residency schedules and submit special requests or missed-pickup reports.
6. Admins review requests within their residency; superadmins can review requests across residencies. Residents receive SMS updates when configured.

## JSON API

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | API health |
| POST | `/api/auth/register` | Public | Create a resident account |
| POST | `/api/auth/login` | Public | Sign in using the selected role |
| GET | `/api/auth/me` | Signed-in user | Get current account |
| GET | `/api/auth/residencies` | Public | List active residencies for registration |
| GET | `/api/schedules` | Signed-in user | List schedules in the allowed scope |
| POST | `/api/schedules` | Admin or superadmin | Create a schedule and notify residents |
| POST | `/api/requests` | Resident | Submit a service request |
| GET | `/api/requests` | Admin or superadmin | List requests in the allowed scope |
| PATCH | `/api/requests/:id` | Admin or superadmin | Review a request in the allowed scope |
| GET/POST | `/api/residencies` | Superadmin | List or create residencies |
| PATCH | `/api/residencies/:id` | Superadmin | Activate or deactivate a residency |
| GET/POST | `/api/users` | Admin or superadmin | List or create accounts in the allowed scope |
| PATCH | `/api/users/:id` | Superadmin | Change an account's role or residency |

Protected endpoints use `Authorization: Bearer <token>`. API errors are returned as JSON with an `error` message. SMS delivery is best-effort and its result is included in the JSON response.

## Production build

Run `npm run build` to build the frontend into `dist/`. Configure your production web server to serve that directory and proxy `/api` to the Express server. Set production environment variables through your hosting provider; do not commit `.env`.
