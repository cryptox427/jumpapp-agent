#!/bin/bash

echo "🐳 Starting PostgreSQL with pgvector in Docker..."

# Start only the PostgreSQL container
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker-compose exec postgres pg_isready -U jumpapp_user -d jumpapp; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done

echo "✅ PostgreSQL is ready!"
echo ""
echo "Connection details:"
echo "- Host: localhost"
echo "- Port: 5432"
echo "- Database: jumpapp"
echo "- User: jumpapp_user"
echo "- Password: jumpapp_password"
echo ""
echo "To connect from your app, use:"
echo "DATABASE_URL=\"postgresql://jumpapp_user:jumpapp_password@localhost:5432/jumpapp\""
echo ""
echo "To stop the container: docker-compose down"
echo "To view logs: docker-compose logs postgres"
