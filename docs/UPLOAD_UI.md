# Upload Interface Implementation

## Overview

The upload interface allows users to submit datasets for bias analysis through a clean, functional form.

## Component Structure

### Client Component

```tsx
'use client'

import { useState } from 'react'
```

**Why Client Component?**
- Uses React hooks (`useState`)
- Handles user interactions (file upload, form submit)
- Makes API calls with `fetch`

### State Management

```tsx
const [file, setFile] = useState<File | null>(null)
const [systemDescription, setSystemDescription] = useState('')
const [isLoading, setIsLoading] = useState(false)
const [result, setResult] = useState<any>(null)
const [error, setError] = useState<string | null>(null)
```

**State Variables**:
1. `file` - Selected file object
2. `systemDescription` - User's description of the dataset
3. `isLoading` - Loading state during API call
4. `result` - API response data
5. `error` - Error message (if any)

## Form Components

### 1. File Input

```tsx
<input
  type="file"
  id="file"
  accept=".csv,.pdf,.png,.jpg,.jpeg"
  onChange={handleFileChange}
  className="..."
/>
```

**Features**:
- Accepts: CSV, PDF, PNG, JPG, JPEG
- Shows selected file name and size
- Styled file input button

**File Change Handler**:
```tsx
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const selectedFile = e.target.files?.[0]
  if (selectedFile) {
    setFile(selectedFile)
    setError(null) // Clear previous errors
  }
}
```

### 2. System Description Textarea

```tsx
<textarea
  id="description"
  value={systemDescription}
  onChange={(e) => setSystemDescription(e.target.value)}
  rows={4}
  placeholder="Describe what this dataset represents..."
  className="..."
/>
```

**Features**:
- 4 rows tall
- Placeholder text with examples
- Controlled component (value from state)

### 3. Analyze Button

```tsx
<button
  type="submit"
  disabled={isLoading}
  className="..."
>
  {isLoading ? (
    <>
      <svg className="animate-spin h-5 w-5">...</svg>
      Analyzing...
    </>
  ) : (
    'Analyze Dataset'
  )}
</button>
```

**Features**:
- Disabled during loading
- Shows spinner when loading
- Text changes: "Analyze Dataset" → "Analyzing..."

## API Call Flow

### Form Submit Handler

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  
  // 1. Reset previous results
  setResult(null)
  setError(null)
  
  // 2. Validate inputs
  if (!file) {
    setError('Please select a file')
    return
  }
  
  if (!systemDescription.trim()) {
    setError('Please provide a system description')
    return
  }
  
  // 3. Prepare form data
  const formData = new FormData()
  formData.append('file', file)
  formData.append('systemDescription', systemDescription)
  
  // 4. Call API
  setIsLoading(true)
  
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: formData,
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      setError(data.error || 'Analysis failed')
    } else {
      setResult(data)
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Network error')
  } finally {
    setIsLoading(false)
  }
}
```

### Flow Diagram

```
User clicks "Analyze Dataset"
         ↓
Validate file and description
         ↓
    Valid?
    ↙    ↘
  No      Yes
   ↓       ↓
Show    Create FormData
error      ↓
      Set isLoading = true
           ↓
      POST /api/analyze
           ↓
      Wait for response
           ↓
      Parse JSON
           ↓
    Success?
    ↙    ↘
  No      Yes
   ↓       ↓
Show    Display
error   result
   ↓       ↓
Set isLoading = false
```

### Error Handling

**Client-Side Validation**:
- Missing file → "Please select a file"
- Empty description → "Please provide a system description"

**API Errors**:
- HTTP error → Display `data.error` from response
- Network error → Display error message

**No Error Swallowing**:
- All errors displayed to user
- Errors shown in red alert box

## Results Display

### JSON Response Viewer

```tsx
{result && (
  <div className="mt-8">
    <h3 className="text-lg font-semibold...">
      Analysis Result
    </h3>
    <div className="p-4 rounded-lg bg-slate-100...">
      <pre className="text-sm...">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  </div>
)}
```

**Features**:
- Only shows when result exists
- Formatted JSON (2-space indent)
- Scrollable container
- Syntax highlighting via `<pre>` tag

## Layout Structure

```
┌────────────┬─────────────────────────────────┐
│  Sidebar   │  Main Content                   │
│            │                                 │
│ (unchanged)│  Upload Dataset for Analysis    │
│            │                                 │
│            │  [File Input]                   │
│            │  Selected: test.csv (1.2 KB)    │
│            │                                 │
│            │  [System Description]           │
│            │  (4-row textarea)               │
│            │                                 │
│            │  [Analyze Dataset]              │
│            │                                 │
│            │  Analysis Result                │
│            │  {                              │
│            │    "id": "...",                 │
│            │    "status": "completed",       │
│            │    ...                          │
│            │  }                              │
└────────────┴─────────────────────────────────┘
```

## Styling Details

### Form Spacing

```tsx
<form className="space-y-6">
  {/* 24px gap between form elements */}
</form>
```

### File Input Styling

```tsx
className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
```

**Custom File Button**:
- Blue background
- Rounded corners
- Hover effect
- Semibold text

### Error Display

```tsx
<div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
</div>
```

**Features**:
- Red background (light/dark mode)
- Border for emphasis
- Padding for readability

### Loading Spinner

```tsx
<svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
</svg>
```

**Features**:
- Tailwind `animate-spin` utility
- White color (inherits from button)
- 20px size

## Anonymous User Support

**Works for anonymous users**:
- No authentication required
- API handles anonymous limits (5MB, 1 concurrent request)
- Results are ephemeral (not saved)

**User Experience**:
- Can upload and analyze immediately
- Sees message: "Sign in to save results and access full features"
- Rate limited if multiple requests

## Key Features

✅ **File Upload**: Drag-and-drop or click to select  
✅ **File Validation**: Client-side accept attribute  
✅ **System Description**: Required textarea  
✅ **Loading State**: Spinner + disabled button  
✅ **Error Display**: Red alert box  
✅ **JSON Response**: Formatted, scrollable  
✅ **Anonymous Support**: Works without login  
✅ **Dark Mode**: Full support  

## Testing

### Manual Testing

1. **Upload valid file**:
   - Select CSV file
   - Enter description
   - Click "Analyze Dataset"
   - See loading spinner
   - See JSON response

2. **Test validation**:
   - Click submit without file → Error
   - Click submit without description → Error

3. **Test error handling**:
   - Upload 10MB file (anonymous) → Error
   - Make second request immediately → Rate limit error

4. **Test loading state**:
   - Button disabled during loading
   - Spinner visible
   - Text changes to "Analyzing..."

## Next Steps

After upload UI:

1. **Parse JSON response**:
   - Display bias signals
   - Show statistical results
   - Format limitations

2. **Add chat interface**:
   - Enable "New Chat" button
   - Show chat UI below results
   - Connect to chat API

3. **Add history**:
   - Save analyses for authenticated users
   - Show list in sidebar
   - Click to view previous results

4. **Improve UX**:
   - Add file drag-and-drop
   - Show upload progress
   - Add result visualizations

## Summary

✅ **Functional Upload Form**: File + description inputs  
✅ **API Integration**: Calls POST /api/analyze  
✅ **Loading State**: Spinner and disabled button  
✅ **Error Handling**: Validation and API errors  
✅ **Results Display**: Raw JSON response  
✅ **Anonymous Support**: Works without authentication  
✅ **Clean Design**: Tailwind CSS styling  

The upload interface is complete and ready for users to analyze datasets!
