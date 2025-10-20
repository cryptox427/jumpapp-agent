# HubSpot-Only RAG Troubleshooting Guide

## Issue: "I couldn't find any recent information about client contacts"

This error occurs when the RAG system doesn't have any HubSpot data to search through. Here's how to fix it:

## 🔍 **Step 1: Check Your Data Status**

First, let's see what data you have:

```bash
# Check your RAG data status
curl -X GET http://localhost:3000/api/debug/rag-status
```

Or run the diagnostic script:
```bash
node scripts/check-rag-data.js
```

## 📥 **Step 2: Import Your Data**

If you have no data (contacts: 0, notes: 0), you need to import it:

### Option A: Import All HubSpot Data (Recommended)
```bash
curl -X POST http://localhost:3000/api/import/rag \
  -H "Content-Type: application/json" \
  -d '{"type": "all"}'
```

### Option B: Import Specific Data Types
```bash
# Import contacts only
curl -X POST http://localhost:3000/api/import/rag \
  -H "Content-Type: application/json" \
  -d '{"type": "contacts"}'

# Import notes only
curl -X POST http://localhost:3000/api/import/rag \
  -H "Content-Type: application/json" \
  -d '{"type": "notes"}'
```

## 🔐 **Step 3: Check Authentication**

Make sure you're connected to HubSpot:

1. **HubSpot Connection**: Go to your app and connect HubSpot
2. **Check tokens**: The debug endpoint will show if you have valid tokens

## 🧪 **Step 4: Test the RAG System**

Once you have data imported, test it:

```bash
curl -X POST http://localhost:3000/api/chat/rag \
  -H "Content-Type: application/json" \
  -d '{"message": "What clients have I been in contact with recently?"}'
```

## 🔧 **Common Issues & Solutions**

### Issue: "HubSpot connection required"
**Solution**: Connect your HubSpot account in the app first

### Issue: "User not found"
**Solution**: Make sure you're signed in to the application

### Issue: "Import failed"
**Solution**: Check your API keys and tokens in the .env file

### Issue: "No relevant information found"
**Solution**: 
1. Make sure you have HubSpot data imported
2. Try more specific queries
3. Check if your contacts/notes contain relevant information

## 📊 **Expected Results After Import**

After successful import, you should see:
- **Contacts**: Count > 0
- **Notes**: Count > 0 (if you have HubSpot notes)

## 🎯 **Good Test Queries**

Once you have data, try these queries:

```bash
# General client questions
curl -X POST http://localhost:3000/api/chat/rag \
  -H "Content-Type: application/json" \
  -d '{"message": "What clients have I been in contact with recently?"}'

# Specific searches
curl -X POST http://localhost:3000/api/chat/rag \
  -H "Content-Type: application/json" \
  -d '{"message": "Find contacts from Microsoft"}'

curl -X POST http://localhost:3000/api/chat/rag \
  -H "Content-Type: application/json" \
  -d '{"message": "What notes mention portfolio management?"}'
```

## 🚀 **Quick Start Commands**

If you're starting fresh:

```bash
# 1. Check status
curl -X GET http://localhost:3000/api/debug/rag-status

# 2. Import HubSpot data (if needed)
curl -X POST http://localhost:3000/api/import/rag \
  -H "Content-Type: application/json" \
  -d '{"type": "all"}'

# 3. Test RAG
curl -X POST http://localhost:3000/api/chat/rag \
  -H "Content-Type: application/json" \
  -d '{"message": "What clients have I been in contact with recently?"}'
```

## 📝 **Environment Variables Required**

Make sure your `.env` file has:

```env
# Required for RAG embeddings
OPENAI_API_KEY="your-openai-api-key"

# Required for HubSpot data import
HUBSPOT_CLIENT_ID="your-hubspot-client-id"
HUBSPOT_CLIENT_SECRET="your-hubspot-client-secret"

# Database
DATABASE_URL="file:./dev.db"
```

## 🆘 **Still Having Issues?**

1. **Check the logs**: Look at your server console for error messages
2. **Verify API keys**: Make sure your OpenAI API key is valid
3. **Test connections**: Try the debug endpoint to see what's missing
4. **Check database**: Make sure Prisma is set up correctly

The RAG system needs HubSpot data to work - once you import your contacts and notes, it will be able to answer questions about your clients and communications!
