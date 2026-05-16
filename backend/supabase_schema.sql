-- =============================================
-- WBSEDCL Bill Analyzer — Supabase SQL Schema
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================

-- Bills table (auth.users is built-in from Supabase Auth)
CREATE TABLE IF NOT EXISTS bills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    consumer_id TEXT,
    consumer_name TEXT,
    billing_period TEXT,
    units_consumed FLOAT,
    total_amount FLOAT,
    expected_amount FLOAT,
    has_error BOOLEAN DEFAULT FALSE,
    is_estimated BOOLEAN DEFAULT FALSE,
    reading_status TEXT,
    due_date TEXT,
    ai_analysis TEXT,           -- Claude's analysis text
    raw_analysis JSONB,         -- tariff calculation breakdown
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calculations table for appliance calculator
CREATE TABLE IF NOT EXISTS calculations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    appliances JSONB NOT NULL,
    total_units FLOAT NOT NULL,
    estimated_bill FLOAT NOT NULL,
    months INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security so users only see their own data
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculations ENABLE ROW LEVEL SECURITY;

-- Bills RLS policies
CREATE POLICY "Users can view their own bills"
    ON bills FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bills"
    ON bills FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bills"
    ON bills FOR DELETE
    USING (auth.uid() = user_id);

-- Calculations RLS policies
CREATE POLICY "Users can view their own calculations"
    ON calculations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calculations"
    ON calculations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calculations"
    ON calculations FOR DELETE
    USING (auth.uid() = user_id);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_bills_user_id ON bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calculations_user_id ON calculations(user_id);
