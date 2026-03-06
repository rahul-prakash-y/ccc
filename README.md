# Code Circle Club (CCC) Platform 🚀
A high-performance Hackathon & Competitive Coding Management Platform designed for scale.

## System Architecture Overview
*   **Frontend**: React (v18), `react-router-dom` (v6) for SPA routing, Tailwind CSS & Framer Motion for gamified aesthetics. Uses `@monaco-editor/react` for the live coding Arena and `react-dropzone` for admin file uploads.
*   **Backend**: Node.js + Fastify. We migrated from Express.js to Fastify to benefit from its incredibly high throughput, utilizing `@fastify/jwt` and `@fastify/multipart` for high-performance security.
*   **Database**: MongoDB + Mongoose. The connection pool in `server.js` is optimized (`maxPoolSize: 100`) to easily handle hundreds of concurrent student queries simultaneously without dropping requests. Fastify connects directly to MongoDB Atlas.

## Core Features & Constraints
*   **Strict Security**: No public signup. Admins upload `.xlsx` files to auto-generate passwords.
*   **Live Start/End OTPs**: Admins generate cryptographic OTPs via Fastify. These are projected live to the hall in massive typography to unlock environments.
*   **Anti-Cheat Environment**: 1-hour strict unstoppable timers. The system catches Tab visibility switches and prevents accidental browser refreshes, using a debounced auto-save hook so code is never lost during network drops.

---

## Environment Variables (`.env.example`)
You will need to create a `.env` file at the root of your `backend` directory.

```env
# SERVER CONFIGURATION
PORT=5000
NODE_ENV=production

# MONGODB CONFIGURATION
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.exmple.mongodb.net/code_circuit_club

# AUTHENTICATION
JWT_SECRET=supersecret_ccc_key_change_in_production
MASTER_KEY=ccc_master_seed_2026 # Optional: for manual admin seeding override

# FRONTEND
FRONTEND_URL=http://localhost:3000
```

---

## Startup Instructions

### 1. Initialize the Database API (Terminal 1)
```bash
cd backend
npm install
# Create your .env file here based on the constraints above
node server.js
```

### 2. Initialize the Frontend Arena (Terminal 2)
```bash
cd frontend
npm install
npm start (or npm run dev)
```

---

## The "Day Of" Execution Flow (Admin Guide)

**Step 1. Boot The Server**  
Launch the Fastify backend and React frontend. Log in with your Master Admin Credentials at `/login`.

**Step 2. Bulk Upload Roster**  
Navigate to the Mission Control dashboard (`/admin`). Drag and drop the Excel Roster (containing `Name` and `RollNumber`) into the User Operations dropzone. A CSV containing the auto-generated secure passwords will instantly download. Distribute these to the students via email or printed slips.

**Step 3. Generate Projector OTPs**  
When it's time to begin a round (e.g., "Mini Hackathon"), click the **Generate Keys** button in the dashboard grid. Click the Eye icon to launch the **Projector Mode**, displaying the Start/End OTPs in massive type on the auditorium screen. 

**Step 4. Monitor Live Dashboard**  
Monitor the Live Operations Grid metrics. Active Sessions will tick up automatically. Students enter the Start OTP, triggering the strict 1-hour timer. If needed, you can press emergency buttons to force-end connections or adjust timings dynamically. When students are finished, they enter the End OTP to safely close their `Submission` schema in the database.
