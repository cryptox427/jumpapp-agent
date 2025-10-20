# RAG (Retrieval-Augmented Generation) Implementation

This application now includes a comprehensive RAG system that imports Gmail emails and HubSpot records (contacts and notes) with OpenAI embeddings, enabling intelligent search and context-aware AI responses.

## 🚀 Features

### RAG-Based Data Import
- **Gmail Email Import**: Imports emails with OpenAI embeddings for semantic search
- **HubSpot Contact Import**: Imports contacts with embeddings for intelligent matching
- **HubSpot Notes Import**: Imports contact notes with embeddings for context retrieval
- **Vector Similarity Search**: Uses cosine similarity for finding relevant content

### AI-Powered Context Retrieval
- **Automatic Context**: AI automatically searches for relevant data before answering questions
- **Multi-Source Search**: Searches across emails, contacts, and notes simultaneously
- **Relevance Scoring**: Ranks results by semantic similarity to the query
- **Context-Aware Responses**: AI uses retrieved data to provide accurate, personalized answers

## 📋 API Endpoints

### RAG Import Endpoint
```http
POST /api/import/rag
Content-Type: application/json

{
  "type": "all",        // "emails", "contacts", "notes", or "all"
  "maxEmails": 100       // Optional: limit number of emails to import
}
```

### RAG Chat Endpoint
```http
POST /api/chat/rag
Content-Type: application/json

{
  "message": "What clients have I been in contact with recently?",
  "useRAG": true        // Optional: enable/disable RAG context
}
```

## 🔧 How It Works

### 1. Data Import Process
1. **Fetch Data**: Retrieves emails from Gmail API and records from HubSpot API
2. **Generate Embeddings**: Creates OpenAI embeddings for each piece of content
3. **Store with Embeddings**: Saves data to database with vector embeddings
4. **Deduplication**: Skips already imported records

### 2. RAG Search Process
1. **Query Embedding**: Converts user query to embedding vector
2. **Similarity Calculation**: Computes cosine similarity with stored embeddings
3. **Ranking**: Sorts results by relevance score
4. **Context Retrieval**: Returns most relevant emails, contacts, and notes

### 3. AI Response Generation
1. **Context Injection**: Provides retrieved data as context to AI
2. **Tool Integration**: AI can search for additional information using tools
3. **Source Citation**: AI cites specific sources when providing answers
4. **Personalized Responses**: Answers are based on user's actual data

## 🛠️ Usage Examples

### Import All Data with RAG
```bash
curl -X POST http://localhost:3000/api/import/rag \
  -H "Content-Type: application/json" \
  -d '{"type": "all", "maxEmails": 200}'
```

### Ask Questions with RAG Context
```bash
curl -X POST http://localhost:3000/api/chat/rag \
  -H "Content-Type: application/json" \
  -d '{"message": "What investment opportunities have been discussed in my emails?"}'
```

### Search Specific Information
```bash
curl -X POST http://localhost:3000/api/chat/rag \
  -H "Content-Type: application/json" \
  -d '{"message": "Find all emails from John Smith about portfolio management"}'
```

## 📊 RAG Context Response Format

The RAG system returns structured context information:

```json
{
  "success": true,
  "response": "Based on your emails, I found 3 recent communications...",
  "ragContext": {
    "emailsFound": 3,
    "contactsFound": 1,
    "notesFound": 2,
    "summary": "Found 3 relevant emails, 1 relevant contact, 2 relevant notes."
  }
}
```

## 🔍 Search Capabilities

### Email Search
- **Semantic Search**: Finds emails by meaning, not just keywords
- **Sender/Recipient Matching**: Identifies communications with specific people
- **Content Analysis**: Understands email topics and context
- **Date Relevance**: Considers recency in ranking

### Contact Search
- **Name Matching**: Finds contacts by full name or partial matches
- **Company Search**: Locates contacts by company affiliation
- **Email Matching**: Finds contacts by email address
- **Relationship Context**: Considers communication history

### Notes Search
- **Content Analysis**: Searches note content semantically
- **Contact Association**: Links notes to specific contacts
- **Topic Matching**: Finds notes about specific subjects
- **Temporal Relevance**: Considers note creation dates

## ⚡ Performance Considerations

### Embedding Generation
- **Batch Processing**: Generates embeddings efficiently during import
- **Text Truncation**: Limits text to 8000 characters for optimal performance
- **Error Handling**: Falls back to text search if embedding fails
- **Caching**: Stores embeddings to avoid regeneration

### Search Optimization
- **Similarity Threshold**: Only returns results above 0.1 similarity score
- **Result Limiting**: Limits results to prevent overwhelming responses
- **Parallel Processing**: Searches multiple data sources simultaneously
- **Fallback Search**: Uses text search if embeddings are unavailable

## 🧪 Testing

Run the RAG test script to verify functionality:

```bash
node scripts/test-rag.js
```

This will:
1. Import sample data with embeddings
2. Test search functionality across all data types
3. Verify AI responses with RAG context
4. Display performance metrics

## 🔐 Security & Privacy

- **User Isolation**: Each user's data is completely isolated
- **Token Management**: Secure handling of OAuth tokens
- **Data Encryption**: Sensitive data is properly encrypted
- **Access Control**: Authentication required for all operations

## 📈 Benefits

### For Financial Advisors
- **Client Context**: AI understands your client relationships
- **Investment Tracking**: Monitors investment discussions and opportunities
- **Meeting Preparation**: Provides relevant context before meetings
- **Follow-up Automation**: Suggests follow-up actions based on communications

### For Productivity
- **Intelligent Search**: Find information by meaning, not keywords
- **Context-Aware Responses**: AI answers based on your actual data
- **Automated Insights**: Discovers patterns in your communications
- **Personalized Assistance**: AI understands your specific business context

## 🚀 Next Steps

1. **Run Initial Import**: Use `/api/import/rag` to import your data
2. **Test Search**: Try asking questions via `/api/chat/rag`
3. **Monitor Performance**: Check embedding generation and search speed
4. **Customize Queries**: Experiment with different types of questions
5. **Scale Up**: Increase import limits as needed

The RAG system transforms your static data into an intelligent knowledge base that powers context-aware AI responses, making your financial advisory practice more efficient and personalized.
