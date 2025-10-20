#!/bin/bash

echo "🐳 Setting up JumpApp with Docker PostgreSQL..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Database - Docker PostgreSQL
DATABASE_URL="postgresql://jumpapp_user:jumpapp_password@localhost:5432/jumpapp"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Google OAuth - Add your credentials here
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# HubSpot - Add your credentials here
HUBSPOT_CLIENT_ID="your-hubspot-client-id"
HUBSPOT_CLIENT_SECRET="your-hubspot-client-secret"

# OpenAI - Add your API key here
OPENAI_API_KEY="your-openai-api-key"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
EOF
    echo "✅ Created .env file with Docker database configuration"
    echo "⚠️  Please update the OAuth and API credentials in .env file"
else
    echo "📝 .env file already exists"
fi

# Start Docker containers
echo "🐳 Starting PostgreSQL Docker container..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker-compose exec postgres pg_isready -U jumpapp_user -d jumpapp; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done

echo "✅ PostgreSQL is ready!"

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Push database schema
echo "🗄️  Setting up database schema..."
npx prisma db push

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Your PostgreSQL database is running in Docker:"
echo "- Host: localhost"
echo "- Port: 5432"
echo "- Database: jumpapp"
echo "- User: jumpapp_user"
echo "- Password: jumpapp_password"
echo ""
echo "Optional: pgAdmin is available at http://localhost:8080"
echo "- Email: admin@jumpapp.com"
echo "- Password: admin"
echo ""
echo "Next steps:"
echo "1. Update your .env file with actual OAuth and API credentials"
echo "2. Start the development server: npm run dev"
echo "3. Open http://localhost:3000 and sign in with Google"
