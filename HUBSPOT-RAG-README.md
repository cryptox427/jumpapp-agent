# HubSpot-Only RAG System

The RAG (Retrieval-Augmented Generation) system has been updated to work exclusively with HubSpot data, removing the Google Gmail API dependency.

## 🚀 **What Changed**

### **Removed Dependencies**
- ❌ Google Gmail API integration
- ❌ Email import functionality
- ❌ Email search capabilities
- ❌ Email-related AI tools

### **What Remains**
- ✅ HubSpot contacts import with AI embeddings
- ✅ HubSpot notes import with AI embeddings
- ✅ Vector similarity search for contacts and notes
- ✅ AI-powered context retrieval from HubSpot data
- ✅ Contact and note management tools

## 📋 **Updated API Endpoints**

### **RAG Import Endpoint**
```http
POST /api/import/rag
Content-Type: application/json

{
  "type": "all",        // "contacts", "notes", or "all"
}
```

**Available import types:**
- `"contacts"` - Import HubSpot contacts only
- `"notes"` - Import HubSpot notes only  
- `"all"` - Import both contacts and notes

### **RAG Chat Endpoint**
```http
POST /api/chat/rag
Content-Type: application/json

{
  "message": "What clients have I been in contact with recently?",
  "useRAG": true        // Optional: enable/disable RAG context
}
```

### **Debug Endpoint**
```http
GET /api/debug/rag-status
```

## 🔧 **How It Works Now**

### **1. HubSpot Data Import**
1. **Fetch Contacts**: Retrieves contacts from HubSpot API
2. **Fetch Notes**: Retrieves contact notes from HubSpot API
3. **Generate Embeddings**: Creates OpenAI embeddings for each contact and note
4. **Store with Embeddings**: Saves data to database with vector embeddings
5. **Deduplication**: Skips already imported records

### **2. RAG Search Process**
1. **Query Embedding**: Converts user query to embedding vector
2. **Similarity Calculation**: Computes cosine similarity with stored embeddings
3. **Ranking**: Sorts results by relevance score
4. **Context Retrieval**: Returns most relevant contacts and notes

### **3. AI Response Generation**
1. **Context Injection**: Provides retrieved data as context to AI
2. **Tool Integration**: AI can search for additional information using tools
3. **Source Citation**: AI cites specific sources when providing answers
4. **Personalized Responses**: Answers are based on user's actual HubSpot data

## 🛠️ **Usage Examples**

### **Import HubSpot Data**
```bash
# Import all HubSpot data
curl -X POST http://localhost:3000/api/import/rag \
  -H "Content-Type: application/json" \
  -d '{"type": "all"}'

# Import contacts only
curl -X POST http://localhost:3000/api/import/rag \
  -H "Content-Type: application/json" \
  -d '{"type": "contacts"}'

# Import notes only
curl -X POST http://localhost:3000/api/import/rag \
  -H "Content-Type: application/json" \
  -d '{"type": "notes"}'
```

### **Ask Questions with RAG Context**
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

### **Check Data Status**
```bash
curl -X GET http://localhost:3000/api/debug/rag-status
```

## 🔍 **Search Capabilities**

### **Contact Search**
- **Semantic Search**: Finds contacts by meaning, not just keywords
- **Name Matching**: Finds contacts by full name or partial matches
- **Company Search**: Locates contacts by company affiliation
- **Email Matching**: Finds contacts by email address
- **Relationship Context**: Considers communication history from notes

### **Notes Search**
- **Content Analysis**: Searches note content semantically
- **Contact Association**: Links notes to specific contacts
- **Topic Matching**: Finds notes about specific subjects
- **Temporal Relevance**: Considers note creation dates

## 📊 **RAG Context Response Format**

The RAG system returns structured context information:

```json
{
  "success": true,
  "response": "Based on your HubSpot data, I found 3 contacts and 2 relevant notes...",
  "ragContext": {
    "contactsFound": 3,
    "notesFound": 2,
    "summary": "Found 3 relevant contacts, 2 relevant notes."
  }
}
```

## 🎯 **Example Queries That Work**

- *"What clients have I been in contact with recently?"*
- *"Find all contacts from Microsoft"*
- *"What notes mention investment opportunities?"*
- *"Who are my clients in the tech industry?"*
- *"What portfolio management discussions have I had?"*

## ⚡ **Performance Considerations**

### **Embedding Generation**
- **Batch Processing**: Generates embeddings efficiently during import
- **Text Truncation**: Limits text to 8000 characters for optimal performance
- **Error Handling**: Falls back to text search if embedding fails
- **Caching**: Stores embeddings to avoid regeneration

### **Search Optimization**
- **Similarity Threshold**: Only returns results above 0.1 similarity score
- **Result Limiting**: Limits results to prevent overwhelming responses
- **Parallel Processing**: Searches contacts and notes simultaneously
- **Fallback Search**: Uses text search if embeddings are unavailable

## 🔐 **Requirements**

### **Authentication**
- ✅ HubSpot OAuth connection required
- ❌ Google OAuth no longer needed

### **Environment Variables**
```env
# Required for RAG embeddings
OPENAI_API_KEY="your-openai-api-key"

# Required for HubSpot data import
HUBSPOT_CLIENT_ID="your-hubspot-client-id"
HUBSPOT_CLIENT_SECRET="your-hubspot-client-secret"

# Database
DATABASE_URL="file:./dev.db"
```

## 🧪 **Testing**

Run the updated test script:

```bash
node scripts/check-rag-data.js
```

This will:
1. Check your HubSpot connection status
2. Show contact and note counts
3. Display sample data
4. Provide import instructions if needed

## 📈 **Benefits**

### **For Financial Advisors**
- **Client Context**: AI understands your client relationships from HubSpot
- **Investment Tracking**: Monitors investment discussions in contact notes
- **Meeting Preparation**: Provides relevant context before meetings
- **Follow-up Automation**: Suggests follow-up actions based on notes

### **For Productivity**
- **Intelligent Search**: Find information by meaning, not keywords
- **Context-Aware Responses**: AI answers based on your actual HubSpot data
- **Automated Insights**: Discovers patterns in your contact notes
- **Personalized Assistance**: AI understands your specific business context

## 🚀 **Next Steps**

1. **Connect HubSpot**: Make sure you're connected to HubSpot in the app
2. **Run Import**: Use `/api/import/rag` to import your HubSpot data
3. **Test Search**: Try asking questions via `/api/chat/rag`
4. **Monitor Performance**: Check embedding generation and search speed
5. **Customize Queries**: Experiment with different types of questions

The HubSpot-only RAG system provides intelligent, context-aware AI responses based on your actual contact and note data, making your financial advisory practice more efficient and personalized without requiring Gmail access.
