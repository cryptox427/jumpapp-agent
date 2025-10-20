#!/bin/bash

echo "🚀 Initializing JumpApp..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please update .env with your actual credentials before running the app!"
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Push database schema
echo "🗄️  Setting up database schema..."
npx prisma db push

echo "✅ Initialization complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your credentials:"
echo "   - Google OAuth Client ID & Secret"
echo "   - HubSpot OAuth Client ID & Secret" 
echo "   - OpenAI API Key"
echo "   - Database URL"
echo "   - NextAuth Secret"
echo ""
echo "2. Start the development server:"
echo "   npm run dev"
echo ""
echo "3. Open http://localhost:3000 and sign in with Google"
echo ""
echo "4. Connect your HubSpot account"
echo ""
echo "5. Import your data:"
echo "   curl -X POST http://localhost:3000/api/import -H 'Content-Type: application/json' -d '{\"type\": \"all\"}'"
echo ""
echo "6. Start polling service for proactive behavior:"
echo "   curl -X POST http://localhost:3000/api/polling -H 'Content-Type: application/json' -d '{\"action\": \"start\"}'"
