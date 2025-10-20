#!/bin/bash

echo "🗄️  Setting up JumpApp with SQLite..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Database - SQLite
DATABASE_URL="file:./dev.db"

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
    echo "✅ Created .env file with SQLite configuration"
    echo "⚠️  Please update the OAuth and API credentials in .env file"
else
    echo "📝 .env file already exists"
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Push database schema
echo "🗄️  Setting up SQLite database..."
npx prisma db push

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Your SQLite database is ready:"
echo "- Database file: dev.db"
echo "- No Docker required!"
echo ""
echo "Next steps:"
echo "1. Update your .env file with actual OAuth and API credentials"
echo "2. Start the development server: npm run dev"
echo "3. Open http://localhost:3000 and sign in with Google"
