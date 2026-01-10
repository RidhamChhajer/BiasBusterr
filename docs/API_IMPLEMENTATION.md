# Backend API Implementation - Technical Explanation

## Overview

This document explains the technical implementation of the `/api/analyze` endpoint, focusing on the branching logic for anonymous vs authenticated users and the rate limiting approach.

## Architecture

### File Structure

```
app/api/analyze/
└── route.ts              # Main API route handler

lib/
├── types/
│   └── api.ts           # TypeScript type definitions
├── utils/
│   └── rate-limit.ts    # Rate limiting utilities
└── auth/
    └── auth.ts          # Authentication utilities (existing)
```

## Authentication Detection

### How It Works

The API uses the existing auth utilities to detect user authentication status:

```typescript
import { getCurrentUser } from '@/lib/auth/auth'

const user = await getCurrentUser()
const isAuthenticated = user !== null
```

**Flow**:
1. Call `getCurrentUser()` (server-side auth utility)
2. If user object is returned → **Authenticated**
3. If null is returned → **Anonymous**

### Why This Approach?

- **Leverages existing auth**: No duplicate authentication logic
- **Server-side**: Uses Supabase server client (secure)
- **Session-based**: Automatically reads from cookies via middleware
- **Type-safe**: Returns `User | null` with full TypeScript support

## Anonymous vs Authenticated Branching

### Decision Point

```typescript
if (isAuthenticated) {
  // AUTHENTICATED FLOW
  result = await processAuthenticatedAnalysis({...})
} else {
  // ANONYMOUS FLOW
  result = await processAnonymousAnalysis({...})
}
```

### Anonymous Flow

**Characteristics**:
- ✅ Ephemeral processing (no database writes)
- ✅ Rate limited (1 concurrent request)
- ✅ File size limited (5 MB max)
- ✅ Results returned immediately
- ❌ Results NOT saved
- ❌ No history
- ❌ No re-analysis

**Implementation**:
```typescript
async function processAnonymousAnalysis(params) {
  // 1. Simulate processing
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // 2. Return mock result
  return {
    id: `anonymous_${Date.now()}`,
    isAnonymous: true,
    // ... mock data
    message: 'Sign in to save results'
  }
}
```

**Key Points**:
- No database interaction
- Temporary ID (`anonymous_${timestamp}`)
- Clear messaging about limitations
- Encourages sign-up

### Authenticated Flow

**Characteristics**:
- ✅ Persistent storage (placeholder for now)
- ✅ No rate limits
- ✅ Larger file sizes allowed
- ✅ Results saved to database (when implemented)
- ✅ Full history
- ✅ Re-analysis support

**Implementation**:
```typescript
async function processAuthenticatedAnalysis(params) {
  const { userId } = params
  
  // PLACEHOLDER: Will eventually:
  // 1. Save dataset to database
  // 2. Create analysis record
  // 3. Run bias detection
  // 4. Save results
  
  // For now: Return mock data
  return {
    id: `analysis_${Date.now()}`,
    isAnonymous: false,
    // ... mock data
    message: 'Results saved to your account'
  }
}
```

**Key Points**:
- User ID available for database writes
- Persistent ID (will be UUID from DB)
- Clear messaging about persistence
- Ready for database integration

## Rate Limiting Approach

### Design Philosophy

**Goal**: Prevent abuse from anonymous users while keeping implementation simple.

**Approach**: In-memory tracking with IP-based identification.

### Implementation Details

#### 1. In-Memory Store

```typescript
const anonymousRequests = new Map<string, RateLimitEntry>()

interface RateLimitEntry {
  ip: string
  timestamp: number
  isProcessing: boolean
}
```

**Why Map?**
- Fast lookups: O(1) complexity
- Simple API: `get()`, `set()`, `delete()`
- Built-in: No external dependencies

#### 2. IP Extraction

```typescript
function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  
  return 'unknown'
}
```

**Headers Checked** (in order):
1. `x-forwarded-for` - Standard proxy header
2. `x-real-ip` - Nginx/CloudFlare header
3. `'unknown'` - Fallback for development

#### 3. Rate Limit Check

```typescript
function canMakeAnonymousRequest(ip: string) {
  const existing = anonymousRequests.get(ip)
  
  if (!existing) {
    return { allowed: true }
  }
  
  // Check if stale (>10 minutes)
  if (Date.now() - existing.timestamp > MAX_PROCESSING_TIME) {
    anonymousRequests.delete(ip)
    return { allowed: true }
  }
  
  // Check if still processing
  if (existing.isProcessing) {
    return {
      allowed: false,
      reason: 'You already have an analysis in progress'
    }
  }
  
  return { allowed: true }
}
```

**Logic**:
1. No existing entry → **Allow**
2. Entry exists but stale (>10 min) → **Allow** (cleanup old entry)
3. Entry exists and processing → **Deny**
4. Entry exists but not processing → **Allow**

#### 4. Request Lifecycle

```typescript
// Before processing
if (!isAuthenticated) {
  startAnonymousRequest(clientIp)
}

// ... processing ...

// After processing
if (!isAuthenticated) {
  completeAnonymousRequest(clientIp)
}
```

**States**:
- `startAnonymousRequest()` → Sets `isProcessing: true`
- `completeAnonymousRequest()` → Sets `isProcessing: false`

#### 5. Cleanup

```typescript
function cleanupStaleRequests() {
  const now = Date.now()
  
  for (const [ip, entry] of anonymousRequests.entries()) {
    if (now - entry.timestamp > MAX_PROCESSING_TIME) {
      anonymousRequests.delete(ip)
    }
  }
}

// Run every 5 minutes
setInterval(cleanupStaleRequests, 5 * 60 * 1000)
```

**Purpose**: Prevent memory leaks from abandoned requests.

### Limitations & Future Improvements

#### Current Limitations

1. **In-Memory Only**:
   - Lost on server restart
   - Doesn't work across multiple servers
   - Not suitable for production at scale

2. **IP-Based**:
   - Multiple users behind same NAT share limit
   - VPN users can bypass by changing IP
   - Not foolproof

3. **Simple Logic**:
   - Only tracks concurrent requests
   - No time-based rate limiting (e.g., 10 requests/hour)
   - No gradual backoff

#### Production Improvements

**For Production, Consider**:

1. **Redis-Based Rate Limiting**:
   ```typescript
   import { Redis } from '@upstash/redis'
   
   const redis = new Redis({...})
   
   async function canMakeRequest(ip: string) {
     const count = await redis.incr(`ratelimit:${ip}`)
     await redis.expire(`ratelimit:${ip}`, 3600) // 1 hour
     return count <= 10 // Max 10 requests/hour
   }
   ```

2. **Token Bucket Algorithm**:
   - More sophisticated rate limiting
   - Allows bursts while maintaining average rate
   - Industry standard

3. **User-Based Tracking**:
   - Track by session ID or device fingerprint
   - More accurate than IP
   - Harder to bypass

4. **Distributed Rate Limiting**:
   - Works across multiple servers
   - Consistent limits
   - Scales horizontally

## File Size Validation

### Implementation

```typescript
function validateAnonymousFileSize(sizeBytes: number) {
  const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
  
  if (sizeBytes > MAX_SIZE) {
    return {
      valid: false,
      reason: 'File size exceeds 5 MB limit for anonymous users'
    }
  }
  
  return { valid: true }
}
```

### Why 5 MB?

- **Reasonable for CSV**: Most CSV files under 5 MB
- **Prevents abuse**: Limits resource consumption
- **Encourages sign-up**: Larger files require authentication
- **Easy to increase**: Can be raised for authenticated users

### Authenticated Users

**No file size limit** (in skeleton):
- Can upload larger files
- Will need reasonable limits in production (e.g., 100 MB)
- Prevents server overload

## Error Handling

### Error Response Format

```typescript
interface ApiError {
  error: string        // User-friendly message
  code?: string        // Machine-readable code
  details?: unknown    // Additional context
}
```

### Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `MISSING_FILE` | 400 | File not provided |
| `MISSING_DESCRIPTION` | 400 | System description not provided |
| `INVALID_FILE_TYPE` | 400 | Unsupported file type |
| `FILE_TOO_LARGE` | 413 | File exceeds size limit |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Example Error Response

```json
{
  "error": "File size exceeds 5 MB limit for anonymous users. Please sign in for larger files.",
  "code": "FILE_TOO_LARGE"
}
```

## Mock Response Structure

### Purpose

- **Testing**: Frontend can integrate without backend logic
- **API Contract**: Defines expected response shape
- **Documentation**: Shows what real response will look like

### Mock Data

```typescript
{
  id: "analysis_1234567890",
  status: "completed",
  isAnonymous: false,
  dataset: {
    fileName: "hiring_data.csv",
    fileType: "csv",
    fileSizeBytes: 1024000,
    rowCount: 1500  // Mock
  },
  analysis: {
    inferredDomain: "hiring",  // Mock
    suggestedAttributes: ["gender", "age", "race"],  // Mock
    biasSignals: {
      overallRisk: "medium",
      detectedBiases: ["gender"],
      uncertaintyLevel: "medium"
    },
    statisticalResults: {
      statisticalParity: {
        value: 0.12,
        threshold: 0.1,
        violated: true
      }
    },
    limitations: [
      "This is a mock analysis result",
      "Real bias detection not implemented yet"
    ]
  }
}
```

## Security Considerations

### 1. File Upload Security

**Current**:
- File type validation (extension-based)
- File size validation

**Future**:
- MIME type validation
- Virus scanning
- Content validation
- Sanitization

### 2. Rate Limiting

**Current**:
- IP-based tracking
- 1 concurrent request for anonymous

**Future**:
- Redis-based distributed limiting
- More sophisticated algorithms
- User-based tracking

### 3. Input Validation

**Current**:
- Required field checks
- File type validation
- Size validation

**Future**:
- System description length limits
- Content sanitization
- SQL injection prevention (when DB writes added)

## Testing

### Manual Testing

#### Test Anonymous User

```bash
# Upload file as anonymous user
curl -X POST http://localhost:3000/api/analyze \
  -F "file=@test.csv" \
  -F "systemDescription=Test data"

# Try second request immediately (should fail)
curl -X POST http://localhost:3000/api/analyze \
  -F "file=@test.csv" \
  -F "systemDescription=Test data"
```

#### Test Authenticated User

```bash
# Sign in first, then:
curl -X POST http://localhost:3000/api/analyze \
  -H "Cookie: sb-access-token=..." \
  -F "file=@test.csv" \
  -F "systemDescription=Test data"
```

#### Test File Size Limit

```bash
# Create 6 MB file
dd if=/dev/zero of=large.csv bs=1M count=6

# Try to upload (should fail for anonymous)
curl -X POST http://localhost:3000/api/analyze \
  -F "file=@large.csv" \
  -F "systemDescription=Test data"
```

### Automated Testing (Future)

```typescript
describe('POST /api/analyze', () => {
  it('should reject anonymous user with file > 5MB', async () => {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: createFormData(largefile, 'description')
    })
    
    expect(response.status).toBe(413)
    const error = await response.json()
    expect(error.code).toBe('FILE_TOO_LARGE')
  })
  
  it('should allow authenticated user with large file', async () => {
    // ... test with auth
  })
})
```

## Summary

### Key Design Decisions

1. **Authentication Detection**: Use existing `getCurrentUser()` utility
2. **Rate Limiting**: Simple in-memory Map for MVP
3. **File Size**: 5 MB limit for anonymous users
4. **Branching**: Separate functions for anonymous/authenticated flows
5. **Mock Data**: Static responses for testing

### What's Implemented

✅ Authentication detection  
✅ Anonymous user rate limiting  
✅ File size validation  
✅ File type validation  
✅ Mock response generation  
✅ Error handling  
✅ Separate flows for user types  

### What's NOT Implemented

❌ Real file processing  
❌ Bias detection logic  
❌ Database writes  
❌ LLM integration  
❌ Persistent storage  

### Next Steps

1. Implement file processing (CSV, PDF, OCR)
2. Implement deterministic bias detection
3. Add database writes for authenticated users
4. Integrate LLM for explanations
5. Add proper logging and monitoring
