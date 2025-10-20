-- Create the database
CREATE DATABASE jumpapp;

-- Connect to the database
\c jumpapp;

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a user for the application (optional, you can use existing user)
-- CREATE USER jumpapp_user WITH PASSWORD 'your_password_here';
-- GRANT ALL PRIVILEGES ON DATABASE jumpapp TO jumpapp_user;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO jumpapp_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO jumpapp_user;
