# 🚄 SAIL Rake Tracker

A high-performance industrial logistics dashboard designed for tracking, analyzing, and auditing railway rake stabling events across various plants of the **Steel Authority of India Limited (SAIL)**. 

The system automates the ingestion of raw railway operation logs (.xlsx snapshots), computes key metrics and logistics flags, manages a state-based stabling history database, and displays interactive trends and logs in a modern React frontend.

---

## 🌟 Key Features

### 1. Ingestion Pipeline & Report Time Resolution
* **Excel Ingestion**: Drag-and-drop or browse multiple `.xlsx` snapshots at once (1, 2, or 3 files).
* **Smart Validation**: Automatically verifies that files contain the **24 mandatory railway columns** with exact case matching.
* **Auto-Resolved Report Time**: Calculates stabling times relative to a resolved `REPORT TIME`:
  * **Case 1**: If multiple sheets contain a `REPORT TIME` column, it validates consistency (allowing a 1-minute drift).
  * **Case 2**: If only one sheet has a `REPORT TIME`, it propagates that timestamp across all sheets in the batch.
  * **Case 3**: If no sheet contains `REPORT TIME`, it falls back to the maximum status time (`STTS TIME`) found across all rows.

### 2. Logistical Metrics & Real-time Flags
* **Stabled Rakes**: Tracks rakes with Status Code (`STTS CODE`) equal to `"ST"`. Calculates stabled duration hours between the status time and the resolved report time.
* **Idle Alerts**: Automatically flags rakes idle for $\ge 3$ hours at a location.
* **Transit Delays**: Identifies rakes whose Expected Arrival Time (`EXPD ARVLTIME`) is in the past, and Status Code is not `"PL"` (Placed).
* **Loading / Unloading Delays**: Flags delays specifically for rakes in `"LDNG"` or `"ULDG"` placement states whose arrival deadlines have passed.
* **Placed Indicator**: Identifies rakes currently placed (`"PL"` Status Code).

### 3. State Machine & Event Engine (Audit Trail)
When a snapshot is uploaded, the **Event Engine** matches the incoming stabled states against the previous snapshot. It maintains a persistent table (`events`) tracking stabling history through 5 cases:
* **Case 1: ST $\rightarrow$ ST (Same Location)**: Remains `OPEN`. No modifications.
* **Case 2: ST $\rightarrow$ ST (New Location)**: Closes the active event with a `location_change` type and opens a new event.
* **Case 3: ST $\rightarrow$ non-ST**: Closes the active stabled event with a `left_stable` type.
* **Case 4: non-ST $\rightarrow$ ST**: Creates a new `OPEN` stabling event.
* **Case 5: non-ST $\rightarrow$ non-ST**: Ignored.

### 4. Interactive Frontend Dashboard
* **Dynamic Sidebar**: A slide-out navigation panel (revealed by hovering over the left-most 32px of the screen) that hosts historical snapshot logs and page routing.
* **KPI Cards & Modals**: One-click drill-down modals for Stabled, Idle, Transit Delayed, Loading, and Unloading groups.
* **Plant-level Aggregation**: Grouped statistics and breakdowns by station codes for:
  * **BSP** (Bhilai Steel Plant)
  * **DSP** (Durgapur Steel Plant)
  * **RSP** (Rourkela Steel Plant)
  * **BSL** (Bokaro Steel Plant)
  * **ISP** (IISCO Steel Plant)
  * **Fines / Pellet Logistics**
* **Commodity Slicing Charts**: Interactive charts displaying counts that filter instantly on hover/click by commodity groups: *IMCL/NMCL (Coal)*, *IORE/IOST (Iron Ore/Steel)*, *LST/LSST (Limestone)*, and *Others*.
* **Sync-Scroll Data Table**: High-density table featuring double-scrollbars (top/bottom) synchronized for convenient horizontal navigation across the 24 columns, along with real-time text/dropdown filters and a **CSV Export** button.
* **Theme Switching & API Settings**: Custom dark/light mode toggle and a Settings gear to configure remote FastAPI proxy URLs (e.g., ngrok) when local CORS is restricted.

---

## 📁 Repository Structure

```text
DashboardCodeBase/
├── backend/                  # FastAPI Web Server & Processing Engine
│   ├── core/                 # Auth, Supabase clients, and Config schemas
│   ├── models/               # Pydantic data schemas
│   ├── routers/              # API endpoints (Upload, Comparison, Daily/Range Summary)
│   ├── services/             # Core business logic (Parser, Calculator, Event Engine)
│   ├── utils/                # Date/time formatters and validators
│   ├── .env                  # Backend credentials (Supabase, Gemini API)
│   ├── main.py               # Application Entry Point
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React SPA (Vite + TypeScript)
│   ├── src/
│   │   ├── components/       # Shadcn UI reusable interface widgets
│   │   ├── hooks/            # Custom React Query hooks
│   │   ├── lib/              # API wrapper client and global utilities
│   │   ├── routes/           # Pages & Routes (Home, Comparison, summaries)
│   │   ├── router.tsx        # TanStack Router configuration
│   │   └── styles.css        # Global CSS stylesheet (Tailwind configurations)
│   ├── package.json          # Frontend packages and build scripts
│   └── vite.config.ts        # Vite build configurations
└── USER_GUIDE.txt            # System operator manual
```

---

## 🛠️ Data Schema Requirements

Any uploaded spreadsheet **must** contain the following **24 columns** (case-sensitive) for the ingestion parser to succeed:

| # | Column Header | Description | # | Column Header | Description |
|---|---|---|---|---|---|
| **1** | `ZONE` | Zonal Railway code | **13** | `LOAD TYPE` | Details of load configuration |
| **2** | `DVSN` | Railway Division | **14** | `TOTL UNTS` | Total wagon units |
| **3** | `LOCN` | Current Location | **15** | `L/E` | Loaded or Empty indicator |
| **4** | `PLCT RESN` | Placement Reason (e.g. `LDNG`, `ULDG`) | **16** | `CMDT` | Commodity Code |
| **5** | `STTS CODE` | Status Code (e.g. `ST`, `PL`) | **17** | `CNSR` | Consignor |
| **6** | `STTS TIME` | Status Update Time (IST) | **18** | `CNSG` | Consignee |
| **7** | `DVSN FROM` | Departure Division | **19** | `LDNG TIME` | Rake Loading Time |
| **8** | `STTN FROM` | Departure Station | **20** | `TRANSIT TIME`| Elapsed hours in transit |
| **9** | `STTN TO` | Target/Destination Station | **21** | `LOCO NUMB` | Locomotive Engine ID |
| **10**| `CC RAKE` | Closed Circuit Rake Identifier | **22** | `LOCO TYPE` | Locomotive Category |
| **11**| `RAKE NAME` | Unique Rake Name | **23** | `RMNG KM` | Remaining Kilometers to target |
| **12**| `LOAD NAME` | Name of the payload | **24** | `EXPD ARVLTIME`| Expected Arrival Time (IST) |

---

## ⚙️ Installation & Setup

### Prerequisites
* **Python**: `3.10` or above
* **Node.js**: `18.x` or above (with npm/yarn)
* **Database**: A Supabase project initialized with `snapshots`, `records`, and `events` tables.

---

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables. Edit `backend/.env` to define your Supabase credentials and optional tokens:
   ```ini
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-supabase-service-role-key
   GOOGLE_API_KEY=your-gemini-api-key # Optional: For LLM analytics
   API_SECRET_TOKEN=sail_secure_token_2026 # Custom bearer token for route authorization
   ```
5. Run the development server:
   ```bash
   uvicorn main:app --reload
   ```
   The backend API will run on `http://127.0.0.1:8000`.

---

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`.

---

## 🛰️ API Endpoints Reference

The FastAPI backend exposes the following core endpoints (all endpoints require bearer auth using `API_SECRET_TOKEN`):

* `GET /` — Health check, returns service status and timezone.
* `POST /upload` — Ingests a batch of `.xlsx` reports, processes metrics, updates the state database, runs the event engine, and returns comparison logs.
* `GET /snapshots` — Retrieves metadata list of all previously processed snapshots.
* `GET /snapshot/{id}` — Retrieves full details and rake records for a specific snapshot UUID.
* `GET /compare?snapshot_id={id}` — Compares a snapshot with its chronological predecessor to show arrivals, departures, and stabling durations.
* `GET /daily-summary` — Retrieves aggregated stabling logs and idle alert counts for the current day.
* `GET /range-summary?range_type={7d|15d|1m}` — Retrieves historical stabling events and idle alert histories aggregated across time-range buckets.
* `GET /events` — Accesses the raw audit events log (stabling history tracker).

---

## 🔒 Security & CORS configuration
* All API endpoints are protected by token authentication (configured in `verify_auth_token` middleware).
* Cross-Origin Resource Sharing (CORS) is managed through `FRONTEND_URL` settings in `.env`. By default, standard localhost development ports are allowed.
* If deploying or previewing inside sandboxed cloud IDEs, expose the local FastAPI port via ngrok and specify the dynamic public URL inside the **Settings Gear** configuration in the dashboard interface to synchronize the client.
