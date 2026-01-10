# App Layout Skeleton - Implementation Guide

## Overview

The app layout uses a two-column design with a persistent sidebar and main content area.

## Layout Structure

### Visual Layout

```
┌─────────────────────────────────────────────────────┐
│ Sidebar (64)  │  Main Content Area (flex-1)         │
│               │                                      │
│ Bias Buster   │                                      │
│ ─────────────│                                      │
│               │                                      │
│ [+ New Chat]  │         [Upload Icon]                │
│               │                                      │
│ [ Search ]    │    Upload interface coming next      │
│               │                                      │
│ [ History ]   │    The upload functionality will...  │
│               │                                      │
│ [ Settings ]  │                                      │
│               │                                      │
│               │                                      │
│               │                                      │
│ Bias Buster v1│                                      │
└─────────────────────────────────────────────────────┘
```

## Component Breakdown

### Sidebar (`w-64`)

**Structure**:
```tsx
<aside className="w-64 bg-white dark:bg-slate-800 border-r...">
  {/* Header */}
  {/* Navigation */}
  {/* Footer */}
</aside>
```

**Width**: Fixed at 64 units (256px)

#### 1. Header Section
```tsx
<div className="p-6 border-b...">
  <h1>Bias Buster</h1>
</div>
```

**Features**:
- Product name
- Bottom border separator
- Padding: `p-6`

#### 2. Navigation Section
```tsx
<nav className="flex-1 p-4 space-y-2">
  {/* Buttons */}
</nav>
```

**Features**:
- Flexible height (`flex-1`)
- Vertical spacing between buttons (`space-y-2`)
- Padding: `p-4`

**Buttons**:

1. **New Chat** (Primary)
   - Blue background (`bg-blue-600`)
   - White text
   - Plus icon
   - Disabled state

2. **Search** (Secondary)
   - Gray text
   - Search icon
   - Disabled state

3. **History** (Secondary)
   - Gray text
   - Clock icon
   - Disabled state

4. **Settings** (Secondary)
   - Gray text
   - Gear icon
   - Disabled state

#### 3. Footer Section
```tsx
<div className="p-4 border-t...">
  <p>Bias Buster v1</p>
</div>
```

**Features**:
- Version number
- Top border separator
- Small text (`text-xs`)

### Main Content Area (`flex-1`)

**Structure**:
```tsx
<main className="flex-1 flex items-center justify-center p-8">
  <div className="text-center">
    {/* Icon */}
    {/* Heading */}
    {/* Description */}
  </div>
</main>
```

**Features**:
- Flexible width (`flex-1`)
- Centered content
- Padding: `p-8`

**Content**:
1. Upload icon (blue circle)
2. Heading: "Upload interface coming next"
3. Description text

## Styling Details

### Color Scheme

**Sidebar**:
- Background: `bg-white` / `dark:bg-slate-800`
- Border: `border-slate-200` / `dark:border-slate-700`
- Text: `text-slate-900` / `dark:text-white`

**Buttons**:
- Primary (New Chat): `bg-blue-600` / `hover:bg-blue-700`
- Secondary: `text-slate-700` / `hover:bg-slate-100`
- Disabled: `opacity-50` + `cursor-not-allowed`

**Main Area**:
- Background: `bg-slate-50` / `dark:bg-slate-900`
- Icon background: `bg-blue-100` / `dark:bg-blue-900`
- Icon color: `text-blue-600` / `dark:text-blue-400`

### Button States

**Disabled** (all buttons):
```tsx
disabled
className="...disabled:opacity-50 disabled:cursor-not-allowed"
```

**Hover** (when enabled):
- Primary: Darker blue
- Secondary: Light gray background

### Icons

All icons use Heroicons (outline style):
- New Chat: Plus icon
- Search: Magnifying glass
- History: Clock
- Settings: Gear
- Upload (main): Cloud upload

## Responsive Behavior

**Current**:
- Sidebar: Fixed width (64 units)
- Main content: Flexible width

**Future Improvements**:
- Mobile: Collapsible sidebar
- Tablet: Narrower sidebar
- Desktop: Current layout

## Layout Classes

### Container
```tsx
className="flex h-screen bg-slate-50 dark:bg-slate-900"
```

**Features**:
- Flexbox layout (horizontal)
- Full screen height (`h-screen`)
- Background color

### Sidebar
```tsx
className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col"
```

**Features**:
- Fixed width: 64 units
- Vertical flex layout
- Right border
- Background and border colors

### Main Content
```tsx
className="flex-1 flex items-center justify-center p-8"
```

**Features**:
- Flexible width
- Centered content (both axes)
- Padding

## Button Template

```tsx
<button
  disabled
  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
>
  <svg className="w-5 h-5" ...>
    {/* Icon path */}
  </svg>
  Button Text
</button>
```

**Classes Breakdown**:
- `w-full` - Full width
- `flex items-center gap-3` - Horizontal layout with icon
- `px-4 py-3` - Padding
- `text-left text-sm font-medium` - Text styling
- `rounded-lg` - Rounded corners
- `transition-colors` - Smooth color transitions
- `disabled:opacity-50 disabled:cursor-not-allowed` - Disabled state

## Next Steps

After layout skeleton:

1. **Enable New Chat**:
   - Remove `disabled` attribute
   - Add click handler
   - Navigate to chat interface

2. **Implement Search**:
   - Add search input
   - Filter analysis history
   - Show results

3. **Implement History**:
   - Fetch user's analyses
   - Display list
   - Click to view details

4. **Implement Settings**:
   - User preferences
   - Account settings
   - Theme toggle

5. **Add Upload Interface**:
   - Replace placeholder in main area
   - File upload component
   - System description input

## Summary

✅ **Two-Column Layout**: Sidebar + main content  
✅ **Fixed Sidebar**: 64 units wide  
✅ **Navigation Buttons**: 4 buttons (all disabled)  
✅ **Placeholder Content**: Upload message  
✅ **Dark Mode**: Full support  
✅ **Clean Design**: Minimal, professional  

The app layout skeleton is complete and ready for feature implementation!
