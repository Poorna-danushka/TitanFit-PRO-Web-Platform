# 🏋️ TitanFit Pro - Enterprise Gym & Fitness Management System

**TitanFit Pro** is a modern, enterprise-grade full-stack gym management platform engineered with React 19, TypeScript, Node.js (ES Modules), Express, MongoDB Atlas, AWS S3, and Google Gemini AI.

The platform delivers end-to-end gym operations: multi-role role-based access control (RBAC), package and membership purchasing with Stripe and bank transfers, 1-on-1 personal trainer weekly slot scheduling, digital attendance QR scanning, automated database backups with AWS S3 encryption, automated plan expiration notifications, and AI health assistant capabilities.

---

## 🚀 Key Modules & Business Logics

### 1. 🔐 Multi-Role Access Control (RBAC)
The application enforces strict role-based authorization across 5 system roles:
- **SYSTEM_ADMIN**: Platform superuser with full access to backup/recovery settings, system logs, role promotion, and user management.
- **ADMIN**: Gym management access to packages, purchases, member directories, bank transfer approvals, and announcement broadcasts.
- **TRAINER**: Access to Coach Portal, weekly availability management, trainee assignments, and personal training session bookings.
- **STAFF**: Reception counter interface for manual member attendance check-ins and member verification.
- **MEMBER**: Customer portal for purchasing packages, booking personal trainer slots, generating attendance QR passes, chatting with AI assistant, and tracking membership status.

### 2. 💳 Package, Membership & Payment Processing
- **Package Purchasing**: Members can buy individual or family membership packages.
- **Payment Methods**: Supports instant online card payments via **Stripe** and manual **Bank Transfer** slip uploads.
- **Admin Approval Workflow**: Bank transfer payments enter a pending verification state until an Administrator approves or rejects the payment reference and slip image.
- **Family Member Entitlements**: Package purchases support attaching family member profiles under a single primary billing account.

### 3. 📅 Personal Trainer (PT) Weekly Scheduling Engine
- **Coach Availability Rules**: Coaches configure their weekly recurring schedule (days of week, start/end hours).
- **Plan Entitlement Verification**: Only members with packages having `hasPersonalTrainer: true` or active PT session quotas are eligible to select and book a trainer.
- **Strict 1-on-1 Isolation**: Confirmed bookings lock out the coach slot across all members to prevent double booking.
- **4-Session Weekly Quota**: Members are capped at booking a maximum of 4 personal training sessions per calendar week (Monday to Sunday).
- **Slot Release on Cancellation**: Cancelling a booking immediately frees the slot and restores the member's weekly session quota.
- **Atomic Operations**: Multi-booking sessions execute within MongoDB transactions for rollback safeguard on partial failure.

### 4. 🪪 Digital Attendance & QR Scanner
- **Member QR Generation**: Members generate a dynamic digital pass containing their encrypted member ID.
- **Reception Scanner / Check-In**: Staff scan the member QR code or perform manual member lookup to log entry timestamps.
- **Check-Out & Duration**: Tracks check-out times, total gym session duration, and daily peak capacity stats.

### 5. 🤖 Context-Aware AI Health Assistant (Google Gemini 1.5 Flash)
- **Database RAG Integration**: Built-in `aiContextService` fetches the member's profile data, active package, assigned coach, upcoming PT bookings, and gym schedules.
- **Intelligent Counseling**: The Gemini 1.5 Flash AI provides personalized nutrition advice, workout tips, and gym policy guidance based on real member context.
- **Conversation Persistence**: Chat history is persisted per user in MongoDB (`AIConversation` & `AIMessage` models).

### 6. 🛡️ AWS S3 Automated Database Backup & Disaster Recovery
- **Dual Storage Engine**: Backs up MongoDB databases to AWS S3 using `@aws-sdk/client-s3` or local encrypted archives.
- **Compression & Encryption**: Produces gzip-compressed binary database dumps (`mongodump --archive --gzip`) encrypted with S3 Server-Side Encryption (`AES256`).
- **Integrity Validation**: Computes SHA-256 checksums on creation and validates checksum integrity before executing restores (`mongorestore`).
- **Automated Cron Scheduler**: Integrated `backupScheduler` runs recurring daily/weekly/monthly backups with configurable retention cleanup (e.g. automatically purging backups older than 30 days).
- **Admin Portal**: Dedicated admin screen ([BackupSettings.tsx](file:///c:/Users/poorn/OneDrive/Desktop/fitness_app/frontend/src/pages/admin/BackupSettings.tsx)) for manual backup triggers, one-click database restores, and scheduler configuration.

### 7. ⏰ Plan Expiration & Renewal Notification System
- **Automated Expiration Check**: Daily cron job (`planExpirationScheduler.js`) identifies memberships expiring within 3 days or recently completed.
- **Personalized Email Notifications**: Sends styled HTML emails detailing the member's completing plan, exact completion date, and recommendations for active renewal packages.
- **In-App Alerts**: Automatically dispatches warning notifications to the member's in-app notification inbox.

### 8. 🔑 Forgot Password OTP & Mandatory Password Change
- **Password Reset Request**: Users enter their registered email on the login screen to request a temporary One-Time Password (OTP).
- **OTP Generation & Dispatch**: Backend generates a secure temporary OTP (e.g. `GF-8X4K2P`), sets `mustChangePassword: true`, and emails the OTP to the user.
- **Enforced First-Login Redirect**: Logging in with a temporary OTP returns `user.mustChangePassword: true`, triggering an automatic route guard redirect to `/force-change-password`.
- **Password Upgrade**: The user sets a new permanent password meeting all security rules (8+ chars, uppercase, lowercase, digits, special characters), clearing `mustChangePassword` upon success.

---

## 🛠️ Technology Stack

### Backend
- **Node.js (v18+)** — Native ES Modules (`"type": "module"`)
- **Express.js** — RESTful API web framework
- **MongoDB Atlas & Mongoose ODM** — NoSQL database with Schema validation & Indexes
- **AWS SDK v3 (`@aws-sdk/client-s3`)** — Cloud Object Storage for Database Backups
- **Google Generative AI API** — Gemini 1.5 Flash model integration
- **Nodemailer** — SMTP email dispatch service
- **Stripe Node SDK** — Payment processing
- **BcryptJS & JSONWebToken** — Password hashing & JWT authentication
- **Winston** — Production logging engine
- **Joi & Password-Validator** — Input validation & password complexity rules

### Frontend
- **React 19** — User interface library
- **TypeScript** — Static type safety
- **Vite 8** — Next-generation frontend build tool
- **Tailwind CSS v4** — Modern utility-first styling with custom dark theme tokens
- **Framer Motion** — Smooth page transitions and modal animations
- **Lucide React** — Icon suite
- **Axios** — HTTP client with request/response interceptors
- **Recharts** — Admin analytics graphs

---

## 🔒 Security Infrastructure

- **HTTP-Only Cookies**: Access tokens (15-min TTL) and refresh tokens (7-day TTL) stored in HTTP-Only, SameSite cookies.
- **Double-Submit CSRF Protection**: `XSRF-TOKEN` cookie validated against `X-CSRF-Token` request headers on mutating HTTP requests (`POST`, `PUT`, `DELETE`).
- **Token Blacklisting**: Logout immediately invalidates tokens in `TokenBlacklist` collection.
- **Brute-Force Account Protection**: Locks user accounts for 30 minutes after 5 consecutive failed login attempts.
- **Rate Limiting**: Public auth routes are protected by `express-rate-limit`.
- **Security Headers**: Configured with `helmet` and strict CORS policies.

---

## 📁 Repository Directory Structure

```text
fitness_app/
├── backend/
│   ├── config/              # MongoDB connection & Cloudinary config
│   ├── constants/           # Enums & success/error messages
│   ├── controllers/         # API Controllers (auth, admin, trainer, etc.)
│   ├── middleware/          # Auth, CSRF, rate limiter & error handler
│   ├── models/              # Mongoose Schemas (User, Membership, BackupSetting, etc.)
│   ├── routes/              # Express API Routes
│   ├── scripts/             # Admin seeding & reset utility scripts
│   ├── seed/                # Initial database seeders
│   ├── services/            # Business logic (backupService, aiService, paymentService, etc.)
│   ├── tests/               # Integration & unit test suite
│   ├── utils/               # Logger, email transporter, JWT helpers
│   ├── validators/          # Joi input validation schemas
│   ├── server.js            # Express application entry point
│   └── package.json
│
├── frontend/
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── api/             # Axios instance & unified API service (`apiService.ts`)
│   │   ├── components/      # Layouts, Navbar, Sidebars, Protected Routes
│   │   ├── context/         # AuthContext & state providers
│   │   ├── hooks/           # Custom React hooks (useNotifications, useUI)
│   │   ├── pages/           # Application views (Dashboard, Trainers, Login, Admin, etc.)
│   │   ├── utils/           # Input sanitization & security helpers
│   │   ├── App.tsx          # Router configuration & route guards
│   │   └── main.tsx         # React root mounting
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
│
└── README.md
```

---

## ⚙️ Environment Variables Setup

### Backend Environment (`backend/.env`)

```env
# Database
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/gymfit-pro?retryWrites=true&w=majority

# JWT & Security
JWT_SECRET=your_secure_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_secure_jwt_refresh_secret_min_32_chars
BCRYPT_SALT_ROUNDS=10

# Server Configuration
PORT=5000
NODE_ENV=development
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Email (SMTP) Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Stripe Payments
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Cloudinary Image Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# AI Assistant Configuration
AI_MODEL=gemini-1.5-flash
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_API_KEY=your_gemini_api_key

# AWS S3 Backup Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET_NAME=gym-project-backups
AWS_S3_PREFIX=database-backups
BACKUP_SCHEDULER_ENABLED=true
BACKUP_RETENTION_DAYS=30
```

### Frontend Environment (`frontend/.env`)

```env
VITE_API_BASE_URL=/api
```

---

## 🚦 Getting Started

### 1. Clone & Install Dependencies

```bash
# Clone repository
git clone https://github.com/Poorna-danushka/fitness_app.git
cd fitness_app

# Install Backend Dependencies
cd backend
npm install

# Install Frontend Dependencies
cd ../frontend
npm install
```

### 2. Database Seeding

To initialize default membership plans, gym packages, and admin users:

```bash
cd backend
npm run seed
```

To create/update a System Admin account:

```bash
node scripts/makeSystemAdmin.js
```

### 3. Run Development Servers

**Backend Server (Terminal 1):**
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

**Frontend Application (Terminal 2):**
```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:3000
```

---

## 🧪 Testing & Verification

Run automated test suites to verify system functionality:

```bash
# Run Coach Scheduling & Slot Isolation Tests
cd backend
node tests/coachScheduling.test.js

# Run Trainer Dashboard Member Filter Tests
node tests/trainerDashboardFilter.test.js

# Run Frontend Type-Check & Production Build
cd ../frontend
npx tsc --noEmit
npm run build
```

---

## 📄 License

This project is proprietary and confidential. Built for **TitanFit Pro** Gym & Fitness Center operations.
