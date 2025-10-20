# JumpApp - AI Assistant for Financial Advisors

An AI-powered assistant that integrates with Gmail, Google Calendar, and HubSpot CRM to help financial advisors manage their client relationships, schedule meetings, and automate routine tasks.

## Features

- **Google OAuth Integration**: Connect Gmail and Google Calendar with read/write permissions
- **HubSpot CRM Integration**: Full access to contacts, notes, and client data
- **AI Chat Interface**: ChatGPT-like interface for asking questions and giving instructions
- **RAG (Retrieval-Augmented Generation)**: Uses vector embeddings to search through emails and CRM data
- **Tool Calling**: AI can perform actions like sending emails, scheduling meetings, and creating CRM records
- **Task Memory**: Multi-step workflows with persistent memory
- **Proactive Automation**: Responds to webhooks and follows ongoing instructions

## Prerequisites

- Node.js 18+ 
- SQLite (included with Node.js) or PostgreSQL with pgvector extension
- Google Cloud Console account (for OAuth)
- HubSpot account (free tier available)
- OpenAI API key

## Quick Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd jumpapp
   npm install
   ```

2. **Run the setup script:**
   ```bash
   # For SQLite (recommended for development)
   npm run setup:sqlite
   
   # Or for PostgreSQL with Docker
   npm run setup:docker
   ```

3. **Configure your environment:**
   - Update `.env` file with your credentials (see detailed setup below)

4. **Start the development server:**
   ```bash
   npm run dev
   ```

## Detailed Setup

### 1. Database Setup

**Option A: SQLite (recommended for development):**
```bash
npm run setup:sqlite
```

**Option B: PostgreSQL with Docker:**
```bash
npm run setup:docker
```

**Option C: Manual PostgreSQL setup:**
```bash
# Create database
createdb jumpapp

# Enable pgvector extension
psql jumpapp -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Run Prisma migrations
npx prisma db push
```

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API and Google Calendar API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Add test users (including `webshookeng@gmail.com` as requested)
6. Copy Client ID and Client Secret to your `.env` file

### 3. HubSpot OAuth Setup

1. Go to [HubSpot Developer Portal](https://developers.hubspot.com/)
2. Create a new app
3. Configure OAuth settings:
   - Redirect URL: `http://localhost:3000/api/connections/hubspot/connect`
   - Scopes: `crm.objects.contacts.read`, `crm.objects.contacts.write`, `crm.objects.notes.read`, `crm.objects.notes.write`
4. Copy Client ID and Client Secret to your `.env` file

### 4. Environment Configuration

Update your `.env` file with the following:

```env
# Database (SQLite for development)
DATABASE_URL="file:./dev.db"

# Or PostgreSQL for production:
# DATABASE_URL="postgresql://username:password@localhost:5432/jumpapp"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# HubSpot
HUBSPOT_CLIENT_ID="your-hubspot-client-id"
HUBSPOT_CLIENT_SECRET="your-hubspot-client-secret"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 5. Data Import

After connecting your accounts, you'll need to import your existing data:

1. **Import emails from Gmail:**
   ```bash
   curl -X POST http://localhost:3000/api/import \
     -H "Content-Type: application/json" \
     -d '{"type": "emails"}'
   ```

2. **Import contacts from HubSpot:**
   ```bash
   curl -X POST http://localhost:3000/api/import \
     -H "Content-Type: application/json" \
     -d '{"type": "contacts"}'
   ```

3. **Import all data:**
   ```bash
   curl -X POST http://localhost:3000/api/import \
     -H "Content-Type: application/json" \
     -d '{"type": "all"}'
   ```

## Usage Examples

### Asking Questions About Clients

- "Who mentioned their kid plays baseball?"
- "Why did Greg say he wanted to sell AAPL stock?"
- "Show me all meetings with Sarah Smith this month"
- "What's the latest update from my client at Microsoft?"

### Giving Instructions

- "Schedule an appointment with Sara Smith"
- "When someone emails me that is not in HubSpot, please create a contact in HubSpot with a note about the email"
- "When I create a contact in HubSpot, send them an email telling them thank you for being a client"
- "When I add an event in my calendar, send an email to attendees tell them about the meeting"

### Multi-Step Workflows

The AI can handle complex workflows like:
1. Looking up a contact in HubSpot
2. Sending them an email with available meeting times
3. Waiting for their response
4. Scheduling the meeting when they confirm
5. Adding notes to their HubSpot record
6. Sending a confirmation email

## Architecture

### Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: PostgreSQL with pgvector
- **Authentication**: NextAuth.js
- **AI**: OpenAI GPT-4 with function calling
- **Integrations**: Google APIs, HubSpot API

### Key Components

- **Chat Interface**: Responsive ChatGPT-like UI
- **RAG System**: Vector embeddings for semantic search
- **Tool Calling**: AI can execute actions via function calls
- **Task Memory**: Persistent storage for multi-step workflows
- **Data Import**: Automated syncing of emails and CRM data

## Development

### Running in Development

```bash
npm run dev
```

### Database Management

```bash
# View database in Prisma Studio
npx prisma studio

# Reset database
npx prisma db push --force-reset

# Generate Prisma client after schema changes
npx prisma generate
```

### Testing Integrations

1. **Test Google OAuth**: Sign in with Google and check connection status
2. **Test HubSpot OAuth**: Click "Connect" in the connection status bar
3. **Test Data Import**: Use the import API endpoints
4. **Test Chat**: Ask questions about your imported data

## Deployment

For production deployment:

1. Set up a PostgreSQL database with pgvector
2. Update environment variables for production
3. Configure OAuth redirect URLs for your domain
4. Deploy to Vercel, Railway, or your preferred platform

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please create an issue in the repository or contact the development team.