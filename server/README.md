# SmartSpend Production-Ready MVC Backend

A comprehensive, enterprise-grade MVC backend designed for the SmartSpend application using **Node.js**, **Express.js**, **MongoDB (Mongoose)**, and **JWT stateful sessions**.

---

## 1. Folder Structure

The backend utilizes a strict Model-View-Controller (MVC) directory structure to maintain a clear separation of concerns, high modularity, and rapid scalability.

```text
server/
│
├── config/
│   └── db.ts                   # MongoDB Mongoose database connection configuration
│
├── controllers/
│   ├── authController.ts       # Signup, Login, Profile, OTP and Reset Verification Logic
│   ├── transactionController.ts# ledger transaction CRUD with filtering, search & pagination
│   ├── budgetController.ts     # category-based budget CRUD logic
│   ├── categoryController.ts   # static defaults seed & custom category management
│   └── analyticsController.ts  # complex MongoDB aggregations for dashboard analytics
│
├── middleware/
│   ├── auth.ts                 # JWT authentication token verification & verification guard
│   └── error.ts                # centralized global middleware catching router exceptions
│
├── models/
│   ├── User.ts                 # Mongoose schema, validation rules and password compare
│   ├── Transaction.ts          # transaction ledger schema with compound query indices
│   ├── Budget.ts               # category spending budget schema with compound unique indices
│   └── Category.ts             # custom and system-wide category schema
│
├── routes/
│   ├── authRoutes.ts           # routes map for signup, login, profile, otp and resending
│   ├── transactionRoutes.ts    # routes map for simple list and custom advanced query txs
│   ├── budgetRoutes.ts         # routes map for categories spending budgets
│   ├── categoryRoutes.ts       # routes map for custom category modifications
│   ├── analyticsRoutes.ts      # routes map for dashboard aggregation and charts stats
│   └── aiRoutes.ts             # routes map for Gemini AI OCR scanner receipt analysis
│
├── services/
│   └── email.ts                # SMTP transport service with beautiful fallback HTML generator
│
├── utils/
│   └── jwt.ts                  # Access and Refresh tokens signing and verification wrappers
│
├── validators/
│   ├── auth.ts                 # request inputs validator schema for user profiles
│   ├── transaction.ts          # request inputs validator schema for transactions
│   └── budget.ts               # request inputs validator schema for category budgets
│
├── uploads/
│   └── .gitkeep                # upload location for files and static receipts storage
│
├── app.ts                      # configures Express app middleware, maps routes, catches errors
├── server.ts                   # microservice entrypoint bootstrapping server & DB standalone
└── package.json                # backend standalone scripts & package dependencies manifest
```

---

## 2. API Endpoints Documentation

All routes are prefix-mapped to `/api/*` and return uniform JSON payloads with standardized HTTP status codes.

### **Authentication & Profiles (`/api/auth`)**
| Method | Endpoint | Description | Auth Required | Body Params |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/register` | Creates an unverified user and emails a 6-digit verification OTP | None | `name`, `email`, `password` |
| **POST** | `/api/auth/login` | Authenticates user credentials and sends an Access Token & Refresh Token (HTTP-Only) | None | `email`, `password` |
| **POST** | `/api/auth/verify-otp` | Validates OTP and updates user status to `verified: true` | None | `email`, `otp` |
| **POST** | `/api/auth/resend-otp` | Resends a new 6-digit numeric verification OTP | None | `email` |
| **POST** | `/api/auth/forgot-password` | Emails a secure reset password token link | None | `email` |
| **POST** | `/api/auth/reset-password` | Verifies reset token and updates the password | None | `token`, `email`, `password` |
| **GET** | `/api/auth/me` | Fetches active authenticated user profile details | Access Token | None |
| **PUT** | `/api/auth/profile` | Updates user details like `name` and `avatar` | Access Token | `name`, `avatar` |
| **POST** | `/api/auth/refresh-token` | Rotates expired access tokens using HttpOnly refresh cookies | Refresh Cookie | None |
| **POST** | `/api/auth/logout` | Clears local refresh cookies and invalidates session | Access Token | None |

### **Ledger Transactions (`/api/transactions`)**
| Method | Endpoint | Description | Auth Required | Query / Body Params |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/transactions` | Advanced filtered, searched, and paginated transaction history | Access Token | Query: `type`, `category`, `search`, `startDate`, `endDate`, `page`, `limit`, `sortBy` |
| **GET** | `/api/transactions/all-records` | Unpaginated complete array of transactions (for legacy direct lists) | Access Token | None |
| **POST** | `/api/transactions` | Commits a new transaction to the ledger | Access Token | Body: `description`, `amount`, `type`, `category`, `date`, `paymentMethod` |
| **PUT** | `/api/transactions/:id` | Edits an existing ledger transaction | Access Token | Body: Any transaction fields |
| **DELETE** | `/api/transactions/:id` | Permanently deletes a ledger transaction | Access Token | Path Param: `:id` |

### **Category Spending Budgets (`/api/budgets`)**
| Method | Endpoint | Description | Auth Required | Body / Path Params |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/budgets` | Fetches all configured category spending budgets | Access Token | None |
| **POST** | `/api/budgets` | Updates limit or creates budget for a category | Access Token | Body: `category`, `limit` |
| **DELETE** | `/api/budgets/:id` | Removes category spending budget | Access Token | Path Param: `:id` |

### **Custom Categories (`/api/categories`)**
| Method | Endpoint | Description | Auth Required | Body / Path Params |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/categories` | Returns system-wide defaults and custom user-defined categories | None / Token | None |
| **POST** | `/api/categories` | Saves a new user-customized Category | Access Token | Body: `name`, `type`, `color` |
| **PUT** | `/api/categories/:id` | Renames or updates color of a custom category | Access Token | Body: `name`, `color` |
| **DELETE** | `/api/categories/:id` | Deletes a custom user-defined category | Access Token | Path Param: `:id` |

### **Complex Analytics & Aggregations (`/api/analytics`)**
| Method | Endpoint | Description | Auth Required | Features |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/analytics/dashboard` | Computes dynamic financial aggregates on the fly | Access Token | Generates total income, expense, savings rates, recent 5 transactions, and real-time category spends vs. budget limits |
| **GET** | `/api/analytics/monthly-reports` | Returns historical year-month financial aggregates | Access Token | Groups all ledger history into month arrays with total income, expense, and net savings for graphs |

### **AI Assistant Receipt OCR Scanner (`/api/ai`)**
| Method | Endpoint | Description | Auth Required | Body Params |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/ai/scan-receipt` | Uses Gemini 3.5 Flash & advanced retry mechanisms to parse transaction details from receipt image | Access Token | `base64Image`, `mimeType` |

---

## 3. Installation & Run Instructions

Ensure your development workspace has Node.js and MongoDB installed, then follow the instructions below.

### **Step 1: Install Dependencies**
```bash
# Install root level workspace packages
npm install

# (Optional) Run install in standalone server directory if running as a separate microservice
cd server
npm install
```

### **Step 2: Database Setup**
1. **Local MongoDB**: Ensure MongoDB is running locally. The server automatically falls back to:
   ```text
   mongodb://127.0.0.1:27017/smartspend
   ```
2. **Cloud MongoDB (Atlas)**: Create a cluster on MongoDB Atlas, whitelist your IP, copy your connection string, and paste it into `.env`:
   ```env
   MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.abc.mongodb.net/smartspend?retryWrites=true&w=majority
   ```

### **Step 3: Configuration**
Copy `.env.example` at the root directory to `.env` and configure your credentials.

```bash
cp .env.example .env
```

### **Step 4: Start the Application**
```bash
# Start full-stack system in development mode (Express server on 3000 proxies Vite frontend)
npm run dev

# Compile full-stack application for production
npm run build

# Start production server hosting compiled assets
npm run start
```

---

## 4. Postman Collection Guidance

Import the `/server/postman_collection.json` file directly into your Postman Workspace:
1. Click **Import** on the top-left menu bar.
2. Select or drop `server/postman_collection.json`.
3. Configure the collection variables `BASE_URL` (defaulting to `http://localhost:3000`) and `ACCESS_TOKEN` for testing requests.

---

## 5. Connecting Frontend with the Backend

To migrate the React frontend to communicate with your new production-ready MongoDB backend instead of prototype memory arrays:

1. **Authentication Token Storage**: Ensure the frontend stores the returned `token` from `/api/auth/login` inside localStorage or sessionStorage.
2. **Setup Request Interceptors (Axios / Fetch)**: Attach the auth token as a Bearer header to every outbound call:
   ```typescript
   // Example Axios Interceptor
   axios.interceptors.request.use(config => {
     const token = localStorage.getItem('token');
     if (token) {
       config.headers.Authorization = `Bearer ${token}`;
     }
     return config;
   });
   ```
3. **Register New Enpoints**: Route calls for budgets (`/api/budgets`), transaction creation (`/api/transactions`), and charts (`/api/analytics/dashboard`) to leverage real-time database aggregate calculations instead of local JS math.
