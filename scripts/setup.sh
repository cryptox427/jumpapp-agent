#!/bin/bash

# Setup script for JumpApp

echo "Setting up JumpApp..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL is not installed. Please install PostgreSQL first."
    echo "On macOS: brew install postgresql"
    echo "On Ubuntu: sudo apt-get install postgresql postgresql-contrib"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Setup environment file
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp env.example .env
    echo "Please update the .env file with your actual credentials."
fi

# Setup database
echo "Setting up database..."
if command -v createdb &> /dev/null; then
    createdb jumpapp 2>/dev/null || echo "Database 'jumpapp' already exists or could not be created."
    psql jumpapp -f scripts/setup-db.sql
else
    echo "Please run the following commands manually:"
    echo "createdb jumpapp"
    echo "psql jumpapp -f scripts/setup-db.sql"
fi

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "Running database migrations..."
npx prisma db push

echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update your .env file with actual credentials"
echo "2. Set up Google OAuth app and add credentials"
echo "3. Set up HubSpot OAuth app and add credentials"
echo "4. Add your OpenAI API key"
echo "5. Run 'npm run dev' to start the development server"
