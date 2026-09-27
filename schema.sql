-- Supabase PostgreSQL Schema for Product Price Tracker

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    selected_option TEXT NOT NULL,
    product_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: scrape_logs
CREATE TABLE IF NOT EXISTS scrape_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    outcome TEXT NOT NULL CHECK (outcome IN ('success', 'retried', 'failed')),
    price NUMERIC NULLABLE,
    stock TEXT NULLABLE,
    attempt_count INTEGER DEFAULT 1,
    error_message TEXT NULLABLE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scrape_logs_product_id ON scrape_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_timestamp ON scrape_logs(timestamp DESC);
