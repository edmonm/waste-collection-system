# Community Waste Collection

A JavaScript starter for the flow in the supplied diagram: account registration and login, role-based dashboards, collection schedules, resident service requests, and SMS notifications.

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
2. Copy `.env.example` to `.env` and set `MONGODB_URI` and a long random `JWT_SECRET`.
3. Start MongoDB.
4. Start the API and Vite development server: `npm run dev`
5. Open <http://localhost:5173>.

The API runs at <http://localhost:3000/api>. Without Twilio credentials, schedule and request workflows still work; the dashboard reports that SMS delivery is not configured.

## Create the first admin

Set `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_PHONE` in `.env`, then run:

```sh
npm run seed:admin
```

Public sign-up always creates a resident account; the seed command is the only included way to provision an administrator.

## Project flow

1. Visitors arrive at the landing page and either log in or create a resident account.
2. The API stores users in MongoDB and issues a signed JWT after successful login.
3. The user role selects the admin or resident dashboard.
4. Admins publish schedules, which are saved and broadcast by SMS to resident phone numbers when Twilio is configured.
5. Residents view schedules and submit special requests or missed-pickup reports.
6. Admins review requests and update their status; the resident receives an SMS status notification when SMS is configured.

## JSON API

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | API health |
| POST | `/api/auth/register` | Public | Create a resident account |
| POST | `/api/auth/login` | Public | Log in |
| GET | `/api/auth/me` | Signed-in user | Get current account |
| GET | `/api/schedules` | Signed-in user | List collection schedules |
| POST | `/api/schedules` | Admin | Create a schedule and notify residents |
| POST | `/api/requests` | Resident | Submit a service request |
| GET | `/api/requests` | Admin | List resident requests |
| PATCH | `/api/requests/:id` | Admin | Review/update a request |

Protected endpoints use `Authorization: Bearer <token>`. API errors are returned as JSON with an `error` message. SMS delivery is best-effort and its result is included in the JSON response.

## Production build

Run `npm run build` to build the frontend into `dist/`. Configure your production web server to serve that directory and proxy `/api` to the Express server. Set production environment variables through your hosting provider; do not commit `.env`.
