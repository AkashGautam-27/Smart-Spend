   # 🪙 SmartSpend
  
  **Intelligent Personal Finance Tracker & AI Wealth Coach**
  
  *An enterprise-grade, full-stack MVC application featuring OCR receipt scanning, voice command natural language transaction processing, and automated financial coaching powered by Gemini 3.5 Flash.*
  
  [Key Features](#-key-features) 
  • [Tech Stack](#-technology-stack) 
  • [Installation](#%EF%B8%8F-installation--run-guide) 
  • [Environment Setup](#-configuration--environment-variables) 
  • [API Documentation](#-api-endpoints) 
  • [Postman Collection](#-postman-testing)


---

## 🌟 Key Features

SmartSpend offers a production-ready, beautiful user interface combined with advanced AI utilities to make personal finance management effortless.

*   💳 **Ledger Transaction Management**: Full CRUD operations for income and expenses with transaction date, description, category, and payment methods (UPI, Cash, Card). Includes pagination, query searching, and sorting.
*   📈 **Interactive Visual Reports**: Beautiful dashboards displaying net savings, cash flow charts, category breakdown pie charts, and monthly trends using [Recharts](https://recharts.org/). Supports exporting reports to **PDF** (via jsPDF) and **Excel** (via SheetJS).
*   🎯 **Budget Planners**: Category-specific budget limits (e.g., Food, Shopping, Utilities) with live status indicators (Safe, Warning, Danger) as spending approaches the limit.
*   🧠 **Gemini AI Receipt OCR Scanner**: Take or upload a photo of a receipt. The built-in **Gemini 3.5 Flash** OCR engine parses the vendor name, total amount, transaction date, and recommends categories with confidence scores automatically.
*   🎙️ **Voice Assistant & NLP**: Input transactions or filter your ledger simply by speaking. SmartSpend parses natural speech (e.g., *"add $25 for groceries on food"* or *"show me my utilities bills"*), updates filters, or stages transactions for confirmation.
*   💡 **AI Wealth Coach Advisor**: Get contextualized, custom advice generated on the fly by analyzing your current spending trends, monthly budgets, and savings forecast.
*   🔒 **Enterprise-Grade Security**: Stateful sessions utilizing JWT tokens. Access tokens are passed securely in headers, while refresh tokens are kept in secure, HttpOnly, SameSite cookies to protect against CSRF and XSS.
*   📧 **Nodemailer Integration**: Handles user registration verification via 6-digit email OTPs, password reset requests, and secure account updates with high-quality HTML email templates.

---

## 📂 Project Architecture

The project is structured as a monorepo containing a React frontend client and an Express backend server.

```text
Smart-Spend/
│
├── client/                     # React + TypeScript + Vite Frontend Application
│   ├── src/
│   │   ├── components/         # Shared components (VoiceAssistant, Layout, etc.)
│   │   ├── context/            # AuthContext (JWT sessions) & TransactionContext (state & filters)
│   │   ├── pages/              # Routing pages (Dashboard, Ledger, Reports, Auth, OTP, Profile, Admin)
│   │   ├── types.ts            # Type definitions for Transactions, Budgets, and User profiles
│   │   ├── App.tsx             # Primary router and application container
│   │   └── main.tsx            # React application entrypoint
│   └── package.json            # Vite, Tailwind, Recharts, jsPDF, and Motion dependencies
│
├── server/                     # Node.js + Express + TypeScript MVC Backend Service
│   ├── config/                 # Mongoose MongoDB configuration
│   ├── controllers/            # Controller logic (Auth, Transactions, Budgets, Analytics, AI)
│   ├── middleware/             # Request routing interceptors (JWT auth guard, central global error handler)
│   ├── models/                 # Database schema definitions (User, Transaction, Budget, Category)
│   ├── routes/                 # Express Router endpoint definitions
│   ├── services/               # Integrations (Nodemailer email service)
│   ├── utils/                  # Cryptography and JWT wrappers
│   ├── validators/             # Request payloads schema checking (express-validator)
│   ├── postman_collection.json # Exported workspace requests for Postman
│   └── package.json            # Express, Mongoose, @google/genai, and tsx dependencies
│
├── .env.example                # Shared environment templates
├── package.json                # Monorepo root automation script registry
└── README.md                   # This overview guide
```

---

## 💻 Technology Stack

### Frontend Client
*   **Core Framework**: React 19 (TypeScript)
*   **Build Utility**: Vite
*   **Styling Engine**: TailwindCSS v4.0 + Lucide React (Icons)
*   **Animations**: Motion (Framer Motion)
*   **Graphs / Analytics**: Recharts
*   **Export Formats**: jsPDF, SheetJS (`xlsx`)

### Backend Server & DB
*   **Runtime**: Node.js & Express with TypeScript compilation (`tsx` & `tsc`)
*   **Database**: MongoDB & Mongoose ODM
*   **Security & Auth**: JWT (Stateful access & refresh tokens) + BcryptJS (Password hashing)
*   **Validator**: Express-Validator
*   **Mail Service**: Nodemailer (configuration)
*   **AI Engine**: Official `@google/genai` (Gemini 3.5 Flash / Gemini Flash Latest)

---

## ⚙️ Configuration & Environment Variables

Copy the `.env.example` file located at the root of the project to a file named `.env` in the root folder (or `.env` inside the `server/` directory, depending on how you run the services):

```bash
# Copy template from root
cp .env.example .env
```


---

## 🛠️ Installation & Run Guide

### **Prerequisites**
Make sure you have [Node.js](https://nodejs.org/) (v18+) and [MongoDB](https://www.mongodb.com/) installed and running on your local machine.

### **Step 1: Install Dependencies**
You can install dependencies across the entire monorepo structure (root, client, and server packages) using the custom command registered in the root:

```bash
# Run from the root of the project
npm run install:all
```

### **Step 2: Start Development Server**
Run both the Express backend and the Vite frontend concurrently in development mode. The frontend dev server includes a proxy mapping `/api/*` requests directly to the backend.

```bash
# Run from the root of the project
npm run dev
```
*   **Vite Frontend (Client)**: Typically starts at [http://localhost:5173](http://localhost:5173) (or checks fallback ports)
*   **Express Backend**: Starts at [http://localhost:3000](http://localhost:3000)

### **Step 3: Compile for Production (Build)**
To compile both the React client bundle and build the TypeScript Express server, run:

```bash
# Build client and server
npm run build

# Start the server hosting static client files
npm run start
```

---

## 🔌 API Endpoints

All backend routes are prefix-mapped to `/api/*` and require standard JSON payloads.

### **Authentication & Profile Routing (`/api/auth`)**
*   `POST /api/auth/register` — Register a new account. Sends a 6-digit OTP to the email.
*   `POST /api/auth/verify-otp` — Verify user account using the 6-digit email OTP.
*   `POST /api/auth/resend-otp` — Generate and email a new verification OTP.
*   `POST /api/auth/login` — Login user credentials. Attaches secure HttpOnly cookie refresh token and returns access token.
*   `POST /api/auth/refresh-token` — Rotates/refreshes expired access tokens.
*   `POST /api/auth/logout` — Invalidates token cookies and logs user out.
*   `GET /api/auth/me` *(Auth Required)* — Retrieves authenticated user profile details.
*   `PUT /api/auth/profile` *(Auth Required)* — Updates name or profile details.

### **Transactions & Ledger (`/api/transactions`)**
*   `GET /api/transactions` *(Auth Required)* — Retrieve paginated, searchable, and filtered transactions (query params: `type`, `category`, `search`, `startDate`, `endDate`, `page`, `limit`, `sortBy`).
*   `GET /api/transactions/all-records` *(Auth Required)* — Returns all transactions without pagination.
*   `POST /api/transactions` *(Auth Required)* — Record a new ledger transaction.
*   `PUT /api/transactions/:id` *(Auth Required)* — Edit an existing transaction.
*   `DELETE /api/transactions/:id` *(Auth Required)* — Permanently delete a transaction.

### **Budgets (`/api/budgets`)**
*   `GET /api/budgets` *(Auth Required)* — Retrieve all user budget configurations.
*   `POST /api/budgets` *(Auth Required)* — Add or update a monthly category budget limit.
*   `DELETE /api/budgets/:id` *(Auth Required)* — Remove a budget limit.

### **Categories (`/api/categories`)**
*   `GET /api/categories` — Get default and custom categories.
*   `POST /api/categories` *(Auth Required)* — Create a custom category.
*   `PUT /api/categories/:id` *(Auth Required)* — Rename or modify a category.
*   `DELETE /api/categories/:id` *(Auth Required)* — Delete a custom category.

### **Dashboard Analytics (`/api/analytics`)**
*   `GET /api/analytics/dashboard` *(Auth Required)* — Returns real-time aggregate charts (total income, total expense, savings rates, and category budget usages).
*   `GET /api/analytics/monthly-reports` *(Auth Required)* — Provides historical monthly financial metrics grouped by year/month.

### **AI Services (`/api/ai`)**
*   `POST /api/ai/scan-receipt` *(Auth Required)* — Parse receipt images (using Gemini OCR). Expects `base64Image` and optional `mimeType` in request body.
*   `POST /api/ai/parse-voice-command` *(Auth Required)* — Interpret voice transcriptions. Expects `query` transcript and user's `transactions`.
*   `POST /api/ai/insights-advisor` *(Auth Required)* — Generate specialized financial guidance based on transaction history and budget configurations.

---

## 🧪 Postman Testing

To test backend routing:
1. Locate the file `server/postman_collection.json`.
2. Import this collection file directly into your **Postman** desktop application.
3. Configure the environment variables `BASE_URL` (usually `http://localhost:3000`) and the `ACCESS_TOKEN` variable to test authenticated routes.

---

## 🔒 Security Best Practices Implemented
1.  **Stateful Token Authentication**: Uses Access Token (in Authorization header) + Refresh Token rotation (in HttpOnly secure cookies) preventing local storage leakage risks.
2.  **No SQL Injection**: Uses **Mongoose** object relational schema mappings that sanitize queries.
3.  **Strict CORS Policy**: CORS configurations restrict requests to authorized domain sources.
4.  **Route Protection**: JWT Guard middleware intercepts all private endpoints.
