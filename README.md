# Bias Buster v1 - Project Scaffold

A responsible AI platform for detecting potential bias in datasets and AI-driven decision systems.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

```bash
# Navigate to the project directory
cd bias-buster

# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
bias-buster/
├── app/                      # Next.js App Router pages and layouts
│   ├── layout.tsx           # Root layout component
│   ├── page.tsx             # Home page
│   ├── globals.css          # Global styles
│   └── favicon.ico          # App icon
│
├── components/              # React components (to be added)
│   └── ui/                  # Reusable UI components
│
├── lib/                     # Core business logic (to be added)
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Utility functions
│
├── public/                  # Static assets
│   └── uploads/             # User uploaded files (gitignored)
│
├── docs/                    # Documentation (to be added)
│
├── .gitignore              # Git ignore rules
├── eslint.config.mjs       # ESLint configuration
├── next.config.ts          # Next.js configuration
├── package.json            # Project dependencies
├── postcss.config.mjs      # PostCSS configuration
├── tailwind.config.ts      # Tailwind CSS configuration (to be created)
└── tsconfig.json           # TypeScript configuration
```

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Linting**: ESLint 9
- **Runtime**: Node.js 18+

## 📝 Folder Descriptions

### `/app` - Application Routes
Contains all pages and layouts using Next.js App Router. Each folder represents a route.

### `/components` - React Components
Reusable React components organized by feature or type.
- `/ui` - Basic UI components (buttons, inputs, cards, etc.)

### `/lib` - Core Logic
Business logic, utilities, and type definitions.
- `/types` - TypeScript interfaces and types
- `/utils` - Helper functions and utilities

### `/public` - Static Files
Static assets served directly by Next.js.
- `/uploads` - Temporary storage for user uploads (not committed to git)

### `/docs` - Documentation
Project documentation, API specs, and methodology guides.

## 🔧 Available Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm build

# Start production server
npm start

# Run ESLint
npm run lint
```

## 🚧 Development Status

This is the **initial scaffold** for Bias Buster v1. The following features are planned but not yet implemented:

- [ ] Authentication system
- [ ] File upload and processing (CSV, PDF, Image)
- [ ] Bias detection engine
- [ ] LLM integration for explanations
- [ ] Database integration
- [ ] API endpoints
- [ ] UI components and styling
- [ ] Chatbot interface

## 🔐 Security Considerations

When implementing features, ensure:
- Authentication is required for all analysis operations
- Row-Level Security (RLS) is enforced in the database
- API keys are never exposed to the client
- User data is isolated and protected
- All file uploads are validated and sanitized

## 📚 Core Principles

1. **No Absolute Claims**: The platform does NOT claim mathematical proof of bias
2. **Deterministic Analysis**: Bias detection is based on statistical signals and rules
3. **LLM for Explanation Only**: LLMs are used for context understanding and report generation, NOT for bias detection
4. **Transparency**: All findings include uncertainty and limitations
5. **Security First**: Authentication, RLS, and data isolation are mandatory

## 🤝 Contributing

This project follows strict guidelines:
- All bias detection logic must be deterministic
- LLMs must never override calculations or invent findings
- Security constraints must never be bypassed
- Uncertainty must always be disclosed

## 📄 License

[To be determined]

## 🔗 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
