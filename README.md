# FixPoint — Home Services Booking Platform

FixPoint is an end-to-end home-services booking platform where customers discover verified professionals (Home Cleaners, Electricians, Plumbers, Carpenters, Painters), schedule convenient appointment time slots, and manage service requests. Service providers manage their offerings, weekly availability schedules, and appointments, while platform administrators oversee user verification, service listings, disputes, and analytics.

---

## 1. Architecture & Tech Stack

- **Backend**: Node.js 22, Express 5, Mongoose (MongoDB Atlas), JWT authentication, bcryptjs, Helmet, Morgan, Express Rate Limit, Node-Cron (for automated reminders and expired pending cancellations). CommonJS architecture.
- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router 7, Axios, Lucide React, Sonner (Toasts), Zod.
- **Timezone**: Strict **Asia/Karachi (PKT, UTC+5)** time zone handling across all slot calculations, cron reminders, and booking cutoffs.
- **Roles**:
  - `CUSTOMER`: Discover providers, book appointments, reschedule, cancel, rate & review completed jobs, manage personal profile.
  - `PROVIDER`: Set working days & hours, define breaks & days off, create services (fixed/hourly in PKR), accept/reject bookings, mark jobs completed or no-show, review clients and earnings.
  - `ADMIN`: Invite providers with temp credentials, review verification documents (CNIC, certificates), approve/reject providers, manage service categories, moderate platform services and reviews, configure platform rules, export CSV reports.

---

## 2. Getting Started & Installation

### Prerequisites
- Node.js (v20+ or v22 recommended)
- MongoDB Atlas connection string or local MongoDB instance
- Cloudinary credentials (for provider verification documents and photo uploads)
- SMTP credentials (Gmail SMTP for OTPs, invitations, and booking reminders)

### Environment Variables

#### Backend (`backend/.env`)
```ini
PORT=4000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/fixpoint?retryWrites=true&w=majority
SECRET_KEY=your_strong_jwt_secret_key
FRONTEND_URL=http://localhost:5173
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
ADMIN_EMAIL=admin@fixpoint.com
ADMIN_PASSWORD=AdminPassword123!
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

#### Frontend (`frontend/.env`)
```ini
VITE_API_URL=http://localhost:4000/api
```

---

## 3. Running the Application

### 1. Backend Server
```bash
cd backend
npm install
npm run dev
# Server runs on http://localhost:4000
```

### 2. Frontend Application
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### 3. Optional: Seeding Demo Data
To immediately populate the platform with verified categories, an approved Electrician with active services, a customer account, a completed booking with a review, and an upcoming confirmed booking:
```bash
node backend/scripts/seedDemo.js
```
**Demo Credentials created by seed:**
- **Admin**: `admin@fixpoint.com` / `Admin123456!`
- **Provider**: `electrician@fixpoint.com` / `Provider123!`
- **Customer**: `customer@fixpoint.com` / `Customer123!`

---

## 4. Booking Flow & Concurrency Engine

```
Select Service -> Select Provider -> Select Date -> Select Time Slot -> Enter Details -> Confirm Booking
```

### Double Booking Prevention (Two-Layer Protection)
1. **Application Layer (`slotService.js`)**:
   Calculates available slots in Asia/Karachi PKT time. Candidate time slots that overlap with existing `pending` or `confirmed` bookings, provider breaks, or days off are dynamically excluded.
2. **Database Layer (`bookingModel.js`)**:
   Enforces a MongoDB partial unique index on `{ providerId: 1, date: 1, startTime: 1 }` filtering `{ status: { $in: ["pending", "confirmed"] } }`. Even under simultaneous concurrent checkout submissions, race conditions are blocked with duplicate key error `E11000` returning HTTP status `409 Conflict`.

### Cancellation & Reschedule Cutoff
- Settings dictate `cancellationWindowHours` (default: 12 hours).
- If `< 12 hours` remain before appointment start time, customers cannot cancel or reschedule confirmed appointments.

### Privacy Safeguards
- Provider phone numbers are shielded from customers until a booking is in `confirmed` or `completed` status.
- Sensitive verification fields (CNIC, document URLs, admin rejection reasons) are never exposed via public endpoints.

---

## 5. API Testing (Postman Collection)

A Postman collection is available at:
```
docs/FixPoint.postman_collection.json
```
Import this file into Postman. It includes pre-configured folders and request bodies for:
- `01. Authentication` (Register, OTP Email Verification, Resend Code, Login, Forgot/Reset Password, Me)
- `02. Public & Discovery` (Categories, Search with Filters, Public Profiles, Slot Calculation, Reviews)
- `03. Customer Bookings & Profile` (Create Booking, Reschedule, Cancel, Review, Profile)
- `04. Provider Management` (Dashboard, Availability, Services CRUD, Booking Accept/Complete/No-Show, Client Roster)
- `05. Admin Management` (Stats, Provider Invite & Verification, Services Moderation, Reports, CSV Export, Settings)
