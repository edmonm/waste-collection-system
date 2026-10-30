# GreenLoop Community Waste Collection

GreenLoop helps a community publish waste collection schedules, notify residents, and handle special collection or missed-pickup requests.

## Technology

- **Frontend:** React, JavaScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, JSON REST API
- **Database:** MongoDB with Mongoose
- **SMS:** Optional TextBee integration using an Android phone as the gateway

## Requirements

Install or have access to:

1. **Node.js 20.19+ or 22.12+** (npm is included with Node.js).
2. **MongoDB**, either MongoDB Community Server running on your computer or a MongoDB Atlas database URI.
3. A terminal such as PowerShell, opened in the project folder.

## First-time setup on Windows

### 1. Open the project folder

In PowerShell:

```powershell
cd C:\Users\Bernales\Downloads\wastemanagementsystem
```

Check that Node.js and npm are installed:

```powershell
node --version
npm --version
```

### 2. Install the project packages

Run this once after downloading the project, or again after dependencies change:

```powershell
npm install
```

### 3. Configure environment variables

Create your local `.env` file from the example:

```powershell
Copy-Item .env.example .env
notepad .env
```

If you already have a `.env`, keep it and edit it instead of copying over it. Set at least:

```dotenv
PORT=3000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/community-waste-collection
JWT_SECRET=replace-this-with-a-long-random-private-value
JWT_EXPIRES_IN=1d

SUPERADMIN_NAME=System Superadmin
SUPERADMIN_EMAIL=you@example.com
SUPERADMIN_PASSWORD=choose-a-private-password
SUPERADMIN_PHONE=+639171234567
```

- For a local MongoDB installation, keep the example `MONGODB_URI` and make sure MongoDB Server is running before you start GreenLoop.
- For MongoDB Atlas, replace `MONGODB_URI` with your Atlas connection URI. Make sure your IP address and database credentials are allowed by Atlas.
- Replace the superadmin example details with your own. The password must be **8-72 characters**. Phone numbers must use Philippine mobile format: `+639` followed by 9 digits.
- Use a long, private random value for `JWT_SECRET`. Do not share or commit `.env`.
- TextBee variables are optional. Leave them blank to use the app without SMS delivery.

### 4. Create the initial superadmin

MongoDB must be running and `.env` must be saved before you run:

```powershell
npm run seed:superadmin
```

This creates the first system-wide account. Run it once. If the account already exists, the script reports a duplicate; sign in with that account instead.

### 5. Start the application

```powershell
npm run dev
```

Keep this terminal window open while using the app. This command starts both the API and the Vite development server.

- Open the app: <http://localhost:5173>
- API health check: <http://localhost:3000/api/health>

To stop the servers, focus the terminal running `npm run dev` and press **Ctrl+C**.

## Set up accounts and residencies

After the app is running:

1. On the sign-in page, choose **Login** and sign in with the superadmin email and password from `.env`.
2. In the superadmin dashboard, create a **residency**.
3. Open **Subdivisions** and create subdivisions under the residency, such as Row House.
4. Create an **Admin** account and assign both the residency and subdivision. The admin can manage residents and service requests only in that subdivision.
5. Admins can create resident accounts; each resident is automatically assigned to the creating admin's subdivision. Superadmins can assign admins and residents to subdivisions from **Accounts**.
6. Collection schedules and SMS notices are shared with all residents in a residency. Service requests are submitted by residents and reviewed by admins within their assigned subdivision.
7. Login identifies the account type from the email address. Admin and superadmin accounts must use the email and password created for them.

There are three account types:

| Account type | Can do |
| --- | --- |
| **Superadmin** | System owner with access across residencies, subdivisions, accounts, schedules, and service requests. |
| **Admin** | Manage residents and requests in the admin's assigned subdivision; publish schedules visible throughout the assigned residency. |
| **User (resident)** | View schedules and receive notifications for their residency; submit service requests within their assigned subdivision. |

Only admins and superadmins can create accounts. Admins create residents in their own subdivision. Superadmins can create admins, residents, or additional superadmins; superadmin accounts are not assigned to a residency or subdivision. From **Accounts**, superadmins can edit account names, view creation dates, change or reset passwords, and lock or unlock accounts.

Existing accounts must be assigned a subdivision by a superadmin under **Accounts** before admins can manage their subdivision's residents and requests. If using `npm run seed:admin`, set both `ADMIN_RESIDENCY_ID` and `ADMIN_SUBDIVISION_ID` in `.env`; create the subdivision in the dashboard first.

Accounts created by an admin or superadmin receive the temporary password `11111111`. On first login, the account holder must choose a new password before the dashboard or any protected features are available.

## Everyday commands

Run these from the project folder:

```powershell
npm run dev
```

Starts the frontend and API for development.

```powershell
npm run build
```

Builds the frontend into `dist`.

```powershell
npm run seed:superadmin
```

Creates the initial superadmin from the `SUPERADMIN_*` values in `.env`. It is not a password reset command and will not replace an existing account.

## SMS notifications

The main account, schedules, and request features work without SMS. To enable text messages through TextBee:

1. Create a TextBee account and install the TextBee gateway app on an Android phone with a SIM that can send SMS. Register the phone in the [TextBee dashboard](https://app.textbee.dev/dashboard) and grant the app SMS permission. Keep the phone powered on and connected to the internet.
2. In the dashboard's **API Keys** panel, generate an API key. The key is shown only once, so copy it somewhere safe.
3. In the Devices panel, copy the registered phone's Device ID. This is optional if you set a default device in TextBee.
4. Put the key and, optionally, the device ID in the root `.env` file:

   ```dotenv
   TEXTBEE_API_KEY=your_textbee_api_key
   TEXTBEE_DEVICE_ID=your_textbee_device_id
   ```

5. Make sure resident phone numbers use international E.164 format (for example, `+639171234567`), then restart the development server.

The backend sends messages through TextBee's REST API. A successful response means TextBee accepted the message into its sending queue; actual delivery depends on the Android phone being online and its SIM/carrier. Without a valid API key, schedules and requests are still saved, but the app reports that the SMS could not be queued. Keep the API key private and never put it in frontend code or commit it to source control.

When an administrator approves a service request, the resident receives an SMS immediately with the approved collection date and estimated collection time (Philippines time). GreenLoop also queues a reminder SMS for that time; due reminders are retried if TextBee cannot queue them and remain scheduled across API restarts. The API server must stay running to process scheduled reminders. On startup, its logs confirm that the reminder worker has started; successful queueing and provider errors are also logged.

## Troubleshooting

### `Missing required environment variables`

Confirm that `.env` exists in the project root beside `package.json`, and that `MONGODB_URI` and `JWT_SECRET` have values. Restart `npm run dev` after editing `.env`.

### MongoDB connection refused or API will not start

Make sure MongoDB Server is running, or check that the Atlas URI, database password, network access, and IP allowlist are correct. The API needs a working MongoDB connection to start.

### `npm run seed:superadmin` says the password must be 8-72 characters

Update `SUPERADMIN_PASSWORD` in `.env` to a password between 8 and 72 characters, save the file, then run the seed command again.

### Login says the email or password is incorrect

Check the email for typos and use the password configured for that account. Login automatically identifies whether the account is a resident, admin, or superadmin.

### First login requires a password change

Accounts created by an admin or superadmin must sign in with the temporary password `11111111`, then set a new password before opening the dashboard. The temporary-password session expires after 10 minutes; sign in again if it expires.

### Admin account has no residency

Admins must be assigned to an active residency. Sign in as a superadmin and assign the admin account to one. Older admin accounts created before residency support may need this assignment before they can sign in.

### Port 3000 or 5173 is already in use

Stop the other process using the port, then rerun `npm run dev`. The API uses port 3000 and Vite uses port 5173 by default.

## API overview

The JSON API is available under `http://localhost:3000/api`. Protected routes require an `Authorization: Bearer <token>` header.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | Check that the API is responding. |
| POST | `/api/auth/login` | Public | Sign in; the account type is identified automatically. |
| GET | `/api/auth/me` | Signed in | Get the current account. |
| GET/POST | `/api/residencies` | Superadmin | List or create residencies. |
| PATCH | `/api/residencies/:id` | Superadmin | Activate or deactivate a residency. |
| GET | `/api/subdivisions` | Admin or superadmin | List subdivisions within the permitted residency scope. |
| POST | `/api/subdivisions` | Superadmin | Create a subdivision in a residency. |
| GET/POST | `/api/users` | Admin or superadmin | List or create accounts within the permitted scope. |
| PATCH | `/api/users/:id` | Superadmin | Assign an account's role, residency, and subdivision. |
| GET | `/api/schedules` | Signed in | List schedules visible to the account. |
| POST | `/api/schedules` | Admin or superadmin | Publish a schedule and notify that residency's residents. |
| POST | `/api/requests` | Resident | Submit a service request. |
| GET | `/api/requests` | Admin or superadmin | List requests within the permitted scope. |
| PATCH | `/api/requests/:id` | Admin or superadmin | Mark a request reviewed within the permitted scope. |

## Production note

`npm run build` creates the frontend files in `dist`. `npm start` starts the Express API; a production web server or hosting platform must serve `dist` and route `/api` requests to the API. Configure production environment variables in the hosting provider and never deploy the local `.env` file.
