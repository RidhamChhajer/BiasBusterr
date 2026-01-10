# Bias Buster - Folder Structure Explanation

## Directory Overview

This document explains the purpose of each folder and file in the Bias Buster project.

## Root Level Files

### `package.json`
Defines project metadata, dependencies, and npm scripts. Contains:
- Project name and version
- Scripts for dev, build, start, and lint
- Dependencies (Next.js, React)
- DevDependencies (TypeScript, Tailwind, ESLint)

### `tsconfig.json`
TypeScript compiler configuration. Defines:
- Compiler options (strict mode, module resolution)
- Path aliases (@/* for imports)
- Include/exclude patterns

### `next.config.ts`
Next.js framework configuration. Used for:
- Custom webpack config
- Environment variables
- Redirects and rewrites
- Image optimization settings

### `eslint.config.mjs`
ESLint configuration for code quality and consistency.

### `postcss.config.mjs`
PostCSS configuration for processing CSS (used by Tailwind).

### `.gitignore`
Specifies files and folders to exclude from version control.

### `README.md`
Project overview, setup instructions, and documentation.

## Directories

### `/app` - Next.js App Router
**Purpose**: Contains all pages, layouts, and route handlers.

**Structure**:
- `layout.tsx` - Root layout wrapping all pages
- `page.tsx` - Home page (route: `/`)
- `globals.css` - Global CSS styles
- Each subfolder becomes a route (e.g., `/app/dashboard/page.tsx` → `/dashboard`)

**Future additions**:
- `/app/api/*` - API route handlers
- `/app/dashboard/*` - Dashboard pages
- `/app/upload/*` - File upload pages
- `/app/analysis/*` - Analysis result pages

### `/components` - React Components
**Purpose**: Reusable React components used across pages.

**Structure**:
- `/ui` - Basic UI components (buttons, inputs, cards, modals)
- Feature-specific components will be added as needed

**Future additions**:
- `BiasReport.tsx` - Display bias analysis results
- `ChatInterface.tsx` - Chatbot UI
- `FileUploader.tsx` - File upload component
- `ConfirmationModal.tsx` - User confirmation dialogs

### `/lib` - Core Business Logic
**Purpose**: Non-React code including utilities, types, and business logic.

**Structure**:
- `/types` - TypeScript type definitions and interfaces
- `/utils` - Helper functions and utilities

**Future additions**:
- `/lib/auth` - Authentication logic
- `/lib/processors` - File processing (CSV, PDF, OCR)
- `/lib/bias-detection` - Bias detection engine
- `/lib/llm` - LLM integration for explanations
- `/lib/security` - Security utilities (RLS, validation)
- `/lib/logging` - Audit logging

### `/public` - Static Assets
**Purpose**: Static files served directly by Next.js.

**Structure**:
- `/uploads` - Temporary storage for user-uploaded files (gitignored)
- Static images, fonts, and other assets

**Important**: The `/uploads` folder should NOT be committed to git as it contains user data.

### `/docs` - Documentation
**Purpose**: Project documentation and guides.

**Future additions**:
- `API.md` - API endpoint documentation
- `BIAS_METHODOLOGY.md` - Bias detection methodology
- `DEPLOYMENT.md` - Deployment guide
- `ARCHITECTURE.md` - System architecture

## Key Principles

### 1. Separation of Concerns
- UI components in `/components`
- Business logic in `/lib`
- Pages and routes in `/app`

### 2. Type Safety
- All TypeScript types in `/lib/types`
- Strict TypeScript configuration enabled

### 3. Security
- Sensitive files in `.gitignore`
- User uploads not committed to version control
- API keys in environment variables (not in code)

### 4. Scalability
- Modular folder structure
- Clear separation between features
- Easy to add new routes and components

## Import Aliases

The project uses `@/*` as an alias for the root directory:

```typescript
// Instead of:
import { MyComponent } from '../../../components/MyComponent'

// Use:
import { MyComponent } from '@/components/MyComponent'
```

## Next Steps

As features are implemented, this structure will expand with:
- Database schema and migrations
- API route handlers
- Authentication middleware
- Bias detection algorithms
- LLM integration
- UI components and styling
