-- Initialize the jumpapp database
-- This script runs when the PostgreSQL container starts for the first time

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a test user (optional)
-- CREATE USER jumpapp_test WITH PASSWORD 'test_password';
-- GRANT ALL PRIVILEGES ON DATABASE jumpapp TO jumpapp_test;

-- You can add any other initialization SQL here
