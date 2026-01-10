# API Routes Documentation

## POST /api/analyze

Analyze a dataset for potential bias.

### Endpoint

```
POST /api/analyze
```

### Authentication

- **Optional**: Works for both authenticated and anonymous users
- Anonymous users have restrictions (see below)

### Request

**Content-Type**: `multipart/form-data`

**Body Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | File | Yes | Dataset file (CSV, PDF, or Image) |
| `systemDescription` | string | Yes | Description of what the data represents |

**Supported File Types**:
- CSV (`.csv`)
- PDF (`.pdf`)
- Images (`.png`, `.jpg`, `.jpeg`)

### Anonymous User Limits

Anonymous users (not logged in) have the following restrictions:

1. **File Size**: Maximum 5 MB
2. **Concurrent Requests**: Only 1 analysis at a time
3. **Persistence**: Results are ephemeral (not saved to database)

To remove these limits, users must sign in.

### Response

**Success (200 OK)**:

```json
{
  "id": "analysis_1234567890",
  "status": "completed",
  "isAnonymous": false,
  "dataset": {
    "fileName": "hiring_data.csv",
    "fileType": "csv",
    "fileSizeBytes": 1024000,
    "rowCount": 1500
  },
  "analysis": {
    "inferredDomain": "hiring",
    "suggestedAttributes": ["gender", "age", "race"],
    "biasSignals": {
      "overallRisk": "medium",
      "detectedBiases": ["gender"],
      "uncertaintyLevel": "medium"
    },
    "statisticalResults": {
      "statisticalParity": {
        "value": 0.12,
        "threshold": 0.1,
        "violated": true
      }
    },
    "limitations": [
      "This is a mock analysis result",
      "Real bias detection not implemented yet"
    ]
  },
  "message": "Analysis complete. Results saved to your account."
}
```

**Error Responses**:

| Status | Code | Description |
|--------|------|-------------|
| 400 | `MISSING_FILE` | File is required |
| 400 | `MISSING_DESCRIPTION` | System description is required |
| 400 | `INVALID_FILE_TYPE` | Unsupported file type |
| 413 | `FILE_TOO_LARGE` | File exceeds 5 MB limit (anonymous users) |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests (anonymous users) |
| 500 | `INTERNAL_ERROR` | Server error |

**Error Response Format**:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional details (optional)"
}
```

### Examples

#### JavaScript/TypeScript (Fetch)

```typescript
const formData = new FormData()
formData.append('file', fileInput.files[0])
formData.append('systemDescription', 'Hiring decisions from 2023')

const response = await fetch('/api/analyze', {
  method: 'POST',
  body: formData,
})

if (response.ok) {
  const result = await response.json()
  console.log('Analysis ID:', result.id)
  console.log('Overall Risk:', result.analysis.biasSignals.overallRisk)
} else {
  const error = await response.json()
  console.error('Error:', error.error)
}
```

#### cURL

```bash
curl -X POST http://localhost:3000/api/analyze \
  -F "file=@hiring_data.csv" \
  -F "systemDescription=Hiring decisions from 2023"
```

### Flow Diagram

```
User uploads file + description
         ↓
Check if authenticated
         ↓
    ┌────┴────┐
    │         │
Anonymous  Authenticated
    │         │
    ↓         ↓
Check rate  Placeholder
limit       (no DB yet)
    │         │
    ↓         ↓
Validate    Process
file size   analysis
(max 5MB)      │
    │         │
    ↓         ↓
Process     Return
ephemeral   result
analysis    (will save
    │       to DB later)
    ↓         │
Return      ↓
result   Return
(not     result
saved)
```

### Implementation Status

**Current (v1 Skeleton)**:
- ✅ Authentication detection
- ✅ Anonymous user rate limiting
- ✅ File size validation
- ✅ Mock analysis results
- ✅ Separate flows for anonymous/authenticated

**Not Yet Implemented**:
- ❌ Real bias detection
- ❌ Database writes
- ❌ File processing (CSV/PDF/Image)
- ❌ LLM integration
- ❌ Persistent storage for authenticated users

### Notes

1. **Mock Data**: Currently returns static mock data for testing
2. **No Persistence**: Even authenticated users don't have results saved yet
3. **Rate Limiting**: Simple in-memory implementation (will need Redis for production)
4. **File Processing**: Files are accepted but not actually processed yet

### Next Steps

After skeleton is complete:
1. Implement file processing (CSV parser, PDF extractor, OCR)
2. Implement deterministic bias detection
3. Add database writes for authenticated users
4. Integrate LLM for domain inference and report generation
5. Add proper error handling and logging
