# JumpApp Deployment Guide

This guide covers deploying JumpApp to production environments.

## Prerequisites

- PostgreSQL database with pgvector extension
- Domain name for your application
- SSL certificate (handled by most hosting platforms)

## Environment Setup

### Required Environment Variables

```env
# Database (Production PostgreSQL URL)
DATABASE_URL="postgresql://username:password@host:5432/jumpapp"

# NextAuth.js
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-production-secret-key"

# Google OAuth (Update redirect URIs)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# HubSpot (Update redirect URIs)
HUBSPOT_CLIENT_ID="your-hubspot-client-id"
HUBSPOT_CLIENT_SECRET="your-hubspot-client-secret"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# App Configuration
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

### OAuth Redirect URIs

Update your OAuth applications with production URLs:

**Google OAuth:**
- Authorized redirect URI: `https://yourdomain.com/api/auth/callback/google`

**HubSpot OAuth:**
- Redirect URL: `https://yourdomain.com/api/connections/hubspot/connect`

## Database Setup

### Using PostgreSQL with pgvector

1. **Install pgvector extension:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. **Run migrations:**
   ```bash
   npx prisma db push
   ```

### Database Providers

**Recommended providers:**
- **Neon** (PostgreSQL with pgvector)
- **Supabase** (PostgreSQL with vector support)
- **Railway** (PostgreSQL with extensions)
- **AWS RDS** with pgvector

## Deployment Platforms

### Vercel (Recommended)

1. **Connect your repository to Vercel**

2. **Set environment variables in Vercel dashboard**

3. **Deploy:**
   ```bash
   vercel --prod
   ```

4. **Database setup:**
   - Use Vercel Postgres or external PostgreSQL
   - Run `npx prisma db push` after deployment

### Railway

1. **Connect repository to Railway**

2. **Add PostgreSQL service:**
   ```bash
   railway add postgresql
   ```

3. **Set environment variables**

4. **Deploy:**
   ```bash
   railway up
   ```

### Docker Deployment

1. **Create Dockerfile:**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Create docker-compose.yml:**
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - DATABASE_URL=postgresql://postgres:password@db:5432/jumpapp
         - NEXTAUTH_URL=http://localhost:3000
       depends_on:
         - db
     
     db:
       image: pgvector/pgvector:pg15
       environment:
         - POSTGRES_DB=jumpapp
         - POSTGRES_USER=postgres
         - POSTGRES_PASSWORD=password
       volumes:
         - postgres_data:/var/lib/postgresql/data
   
   volumes:
     postgres_data:
   ```

3. **Deploy:**
   ```bash
   docker-compose up -d
   ```

## Post-Deployment Setup

### 1. Initialize Database
```bash
npx prisma db push
```

### 2. Start Polling Service
```bash
curl -X POST https://yourdomain.com/api/polling \
  -H "Content-Type: application/json" \
  -d '{"action": "start", "interval": 300000}'
```

### 3. Set Up Webhooks (Optional)

**Gmail Push Notifications:**
- Configure Google Cloud Pub/Sub
- Point webhook to: `https://yourdomain.com/api/webhooks/google`

**HubSpot Webhooks:**
- Configure in HubSpot Developer Portal
- Point to: `https://yourdomain.com/api/webhooks/hubspot`

## Monitoring and Maintenance

### Health Checks

Create a health check endpoint:
```typescript
// src/app/api/health/route.ts
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return Response.json({ status: 'healthy' })
  } catch (error) {
    return Response.json({ status: 'unhealthy' }, { status: 500 })
  }
}
```

### Logging

Set up logging for production:
```typescript
// Add to your API routes
console.log('API call:', { method, url, timestamp: new Date() })
```

### Performance Monitoring

- Use Vercel Analytics or similar
- Monitor database query performance
- Set up alerts for errors

## Security Considerations

### 1. Environment Variables
- Never commit `.env` files
- Use secure secret management
- Rotate keys regularly

### 2. Database Security
- Use connection pooling
- Enable SSL connections
- Restrict database access by IP

### 3. API Security
- Implement rate limiting
- Validate all inputs
- Use CORS properly

### 4. Authentication
- Use strong NextAuth secrets
- Implement session management
- Set up proper redirect URLs

## Scaling Considerations

### Database
- Use connection pooling (PgBouncer)
- Consider read replicas for heavy read workloads
- Monitor query performance

### Application
- Use CDN for static assets
- Implement caching strategies
- Consider horizontal scaling

### AI/ML
- Monitor OpenAI API usage and costs
- Implement request queuing for high volume
- Consider caching embeddings

## Troubleshooting

### Common Issues

1. **Database Connection Errors:**
   - Check DATABASE_URL format
   - Verify pgvector extension is installed
   - Test connection with psql

2. **OAuth Errors:**
   - Verify redirect URIs match exactly
   - Check client ID/secret
   - Ensure test users are added

3. **Import Failures:**
   - Check API quotas
   - Verify token permissions
   - Monitor rate limits

### Debug Commands

```bash
# Check database connection
npx prisma db pull

# Test OAuth flow
curl -X GET https://yourdomain.com/api/auth/providers

# Check import status
curl -X POST https://yourdomain.com/api/import \
  -H "Content-Type: application/json" \
  -d '{"type": "emails"}'
```

## Backup and Recovery

### Database Backups
```bash
# Create backup
pg_dump $DATABASE_URL > backup.sql

# Restore backup
psql $DATABASE_URL < backup.sql
```

### Data Export
- Export user data via API endpoints
- Regular backup of vector embeddings
- Monitor storage usage

## Support and Maintenance

### Regular Tasks
- Monitor error logs
- Update dependencies
- Backup database
- Review API usage

### Updates
- Keep dependencies updated
- Monitor security advisories
- Test updates in staging first

For additional support, refer to the main README.md or create an issue in the repository.
