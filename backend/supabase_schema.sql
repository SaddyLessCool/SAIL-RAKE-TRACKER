-- ============================================================
-- SAIL Rake Tracker — Supabase SQL Schema
-- Run these statements in Supabase → SQL Editor
-- All timestamps are stored as timestamptz (Supabase stores UTC internally;
-- the FastAPI layer handles conversion to/from IST before insertion).
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- TABLE 1: snapshots
-- Stores metadata about each upload batch.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS snapshots (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_time  TIMESTAMPTZ,
    file_names   TEXT[],
    created_at   TIMESTAMPTZ DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────
-- TABLE 2: records
-- One row per clean rake record, linked to its snapshot.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS records (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id          UUID REFERENCES snapshots(id) ON DELETE CASCADE,
    rake_name            TEXT,
    ldng_time            TIMESTAMPTZ,
    dvsn_from            TEXT,
    load_name            TEXT,
    load_type            TEXT,
    sttn_from            TEXT,
    sttn_to              TEXT,
    cmdt                 TEXT,
    stts_code            TEXT,
    zone                 TEXT,
    dvsn                 TEXT,
    locn                 TEXT,
    stts_time            TIMESTAMPTZ,
    transit_time         TEXT,
    expd_arvltime        TIMESTAMPTZ,
    report_time          TIMESTAMPTZ,
    is_idle_3hrs         BOOLEAN DEFAULT FALSE,
    is_stabled           BOOLEAN DEFAULT FALSE,
    is_transit_delayed   BOOLEAN DEFAULT FALSE,
    is_unloading_delayed BOOLEAN DEFAULT FALSE,
    is_loading_delayed   BOOLEAN DEFAULT FALSE,
    stabled_hours        FLOAT
);

-- Index for fast lookup by snapshot
CREATE INDEX IF NOT EXISTS idx_records_snapshot_id ON records(snapshot_id);
-- Index for fast lookup by rake name
CREATE INDEX IF NOT EXISTS idx_records_rake_name ON records(rake_name);


-- ─────────────────────────────────────────────────────────────
-- TABLE 3: events
-- Each row = one continuous stabling period for one rake at one location.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rake_name      TEXT NOT NULL,
    from_state     TEXT,
    to_state       TEXT,
    locn           TEXT,
    start_time     TIMESTAMPTZ,
    end_time       TIMESTAMPTZ,                    -- NULL if still OPEN
    duration_hours FLOAT,                          -- NULL if still OPEN
    status         TEXT CHECK (status IN ('OPEN', 'CLOSED')),
    event_type     TEXT CHECK (event_type IN ('entered_stable', 'left_stable', 'location_change')),
    created_at     TIMESTAMPTZ DEFAULT now(),
    updated_at     TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by rake name
CREATE INDEX IF NOT EXISTS idx_events_rake_name ON events(rake_name);
-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
-- Index for time-range queries
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_end_time ON events(end_time);


-- ─────────────────────────────────────────────────────────────
-- TABLE 4: comparisons
-- Stores the output of each snapshot comparison.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comparisons (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    current_snapshot_id   UUID REFERENCES snapshots(id) ON DELETE CASCADE,
    previous_snapshot_id  UUID REFERENCES snapshots(id) ON DELETE SET NULL,
    still_stabled         JSONB,
    new_stabled           JSONB,
    moved                 JSONB,
    still_stabled_count   INT DEFAULT 0,
    new_stabled_count     INT DEFAULT 0,
    moved_count           INT DEFAULT 0,
    created_at            TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by snapshot
CREATE INDEX IF NOT EXISTS idx_comparisons_current_snapshot ON comparisons(current_snapshot_id);


-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- Disable RLS for internal dashboard use, or configure as needed.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE snapshots   DISABLE ROW LEVEL SECURITY;
ALTER TABLE records     DISABLE ROW LEVEL SECURITY;
ALTER TABLE events      DISABLE ROW LEVEL SECURITY;
ALTER TABLE comparisons DISABLE ROW LEVEL SECURITY;