-- ============================================================================
-- COMPLETE SUPABASE & PIPELINE DATABASE SETUP SCRIPT
-- Run this in your Supabase SQL Editor to fix:
-- "relation processed_jobs does not exist" and enable all bot tables
-- ============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Discovery Runs Table
CREATE TABLE IF NOT EXISTS "discovery_runs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "started_at" TIMESTAMPTZ DEFAULT NOW(),
    "completed_at" TIMESTAMPTZ,
    "duration_ms" BIGINT,
    "total_found" INT,
    "accepted" INT,
    "review_required" INT,
    "duplicates" INT,
    "failed" INT,
    "status" TEXT,
    "metadata" JSONB
);

-- 3. Companies Registry
CREATE TABLE IF NOT EXISTS "companies" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT UNIQUE NOT NULL,
    "website" TEXT,
    "careers_url" TEXT,
    "logo" TEXT,
    "industry" TEXT,
    "size" TEXT,
    "headquarters" TEXT,
    "verification_status" TEXT DEFAULT 'UNVERIFIED',
    "active" BOOLEAN DEFAULT TRUE,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Company ATS
CREATE TABLE IF NOT EXISTS "company_ats" (
    "id" TEXT PRIMARY KEY,
    "company_id" TEXT NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
    "provider" TEXT NOT NULL,
    "api_endpoint" TEXT,
    "board_token" TEXT,
    "career_url" TEXT NOT NULL,
    "enabled" BOOLEAN DEFAULT TRUE,
    "last_sync" TIMESTAMPTZ,
    "next_sync" TIMESTAMPTZ,
    "failure_count" INT DEFAULT 0,
    "health" TEXT DEFAULT 'UNKNOWN',
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE("company_id", "provider")
);

-- 5. Company Statistics
CREATE TABLE IF NOT EXISTS "company_statistics" (
    "id" TEXT PRIMARY KEY,
    "company_id" TEXT UNIQUE NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
    "total_jobs" INT DEFAULT 0,
    "avg_jobs_per_month" DOUBLE PRECISION DEFAULT 0,
    "last_hiring_date" TIMESTAMPTZ,
    "median_salary" INT,
    "freshers_score" INT DEFAULT 0,
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Discovered Jobs Table
CREATE TABLE IF NOT EXISTS "discovered_jobs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "run_id" UUID REFERENCES "discovery_runs"("id"),
    "company_id" TEXT REFERENCES "companies"("id"),
    "source" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "site" TEXT,
    "company" TEXT NOT NULL,
    "company_url" TEXT,
    "company_url_direct" TEXT,
    "company_industry" TEXT,
    "company_description" TEXT,
    "company_logo" TEXT,
    "company_num_employees" TEXT,
    "company_revenue" TEXT,
    "company_rating" DOUBLE PRECISION,
    "company_reviews_count" INT,
    "company_addresses" TEXT,
    "banner_photo_url" TEXT,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "location_country" TEXT,
    "location_city" TEXT,
    "location_region" TEXT,
    "is_remote" BOOLEAN DEFAULT FALSE,
    "employment_type" TEXT,
    "job_type" TEXT,
    "listing_type" TEXT,
    "job_level" TEXT,
    "job_function" TEXT,
    "work_from_home_type" TEXT,
    "apply_link" TEXT NOT NULL,
    "apply_url" TEXT,
    "job_url_direct" TEXT,
    "source_url" TEXT,
    "description" TEXT,
    "external_id" TEXT,
    "ats_id" TEXT,
    "board_token" TEXT,
    "description_source" TEXT,
    "department" TEXT,
    "team" TEXT,
    "posted_at" TIMESTAMPTZ,
    "batch_year" TEXT,
    "degree" TEXT,
    "experience_level" TEXT,
    "experience_range" TEXT,
    "experience_years" TEXT,
    "vacancy_count" INT,
    "skills" TEXT,
    "emails" TEXT,
    "salary_min" DOUBLE PRECISION,
    "salary_max" DOUBLE PRECISION,
    "salary_currency" TEXT,
    "salary_interval" TEXT,
    "salary_source" TEXT,
    "fresher_score" INT,
    "review_required" BOOLEAN DEFAULT FALSE,
    "venue_address" TEXT,
    "cluster_name" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "walkin_date" TEXT,
    "walkin_time" TEXT,
    "reporting_time" TEXT,
    "contact_person" TEXT,
    "contact_phone" TEXT,
    "required_docs" TEXT,
    "status" TEXT DEFAULT 'DISCOVERED',
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW(),
    "last_seen_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint & Indexes for discovered_jobs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discovered_jobs_source_external_id_key') THEN
        ALTER TABLE "discovered_jobs" ADD CONSTRAINT "discovered_jobs_source_external_id_key" UNIQUE ("source", "external_id");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'discovered_jobs_source_apply_link_key') THEN
        ALTER TABLE "discovered_jobs" ADD CONSTRAINT "discovered_jobs_source_apply_link_key" UNIQUE ("source", "apply_link");
    END IF;
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "discovered_jobs_source_idx" ON "discovered_jobs"("source");
CREATE INDEX IF NOT EXISTS "discovered_jobs_status_idx" ON "discovered_jobs"("status");
CREATE INDEX IF NOT EXISTS "discovered_jobs_company_idx" ON "discovered_jobs"("company");
CREATE INDEX IF NOT EXISTS "discovered_jobs_apply_link_idx" ON "discovered_jobs"("apply_link");
CREATE INDEX IF NOT EXISTS "discovered_jobs_cluster_name_idx" ON "discovered_jobs"("cluster_name");
CREATE INDEX IF NOT EXISTS "discovered_jobs_location_city_idx" ON "discovered_jobs"("location_city");
CREATE INDEX IF NOT EXISTS "discovered_jobs_lat_lng_idx" ON "discovered_jobs"("latitude", "longitude");

-- 7. Processed Jobs Table (Fixes: "relation processed_jobs does not exist")
CREATE TABLE IF NOT EXISTS "processed_jobs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "discovered_job_id" UUID REFERENCES "discovered_jobs"("id") ON DELETE SET NULL,
    "company_id" TEXT REFERENCES "companies"("id") ON DELETE SET NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "company_website" TEXT,
    "company_logo_url" TEXT,
    "description" TEXT NOT NULL,
    
    -- Arrays
    "allowed_degrees" TEXT[] DEFAULT '{}',
    "allowed_courses" TEXT[] DEFAULT '{}',
    "allowed_specializations" TEXT[] DEFAULT '{}',
    "allowed_passout_years" TEXT[] DEFAULT '{}',
    "required_skills" TEXT[] DEFAULT '{}',
    "locations" TEXT[] DEFAULT '{}',
    
    -- JSON structures
    "structured_locations" JSONB,
    "application_details" JSONB,
    "walk_in_details" JSONB,
    
    -- Metadata
    "work_mode" TEXT,
    "experience_min" INT DEFAULT 0,
    "experience_max" INT DEFAULT 0,
    "salary_range" TEXT,
    "salary_amount" TEXT,
    "salary_period" TEXT DEFAULT 'YEARLY',
    "employment_type" TEXT,
    "job_function" TEXT,
    
    -- Text blocks
    "incentives" TEXT,
    "selection_process" TEXT,
    "notes_highlights" TEXT,
    
    -- Links
    "apply_link" TEXT NOT NULL,
    "source_url" TEXT,
    "custom_slug" TEXT UNIQUE,
    
    -- State
    "status" TEXT DEFAULT 'PENDING_REVIEW',
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for processed_jobs
CREATE INDEX IF NOT EXISTS "processed_jobs_status_idx" ON "processed_jobs"("status");
CREATE INDEX IF NOT EXISTS "processed_jobs_company_idx" ON "processed_jobs"("company");
CREATE INDEX IF NOT EXISTS "processed_jobs_company_id_idx" ON "processed_jobs"("company_id");
CREATE INDEX IF NOT EXISTS "processed_jobs_apply_link_idx" ON "processed_jobs"("apply_link");
