# Bias Buster - Project Setup Guide

## Commands to Create This Project

This document explains how to recreate the Bias Buster scaffold from scratch.

## Step 1: Create Project Directory

```bash
# Create and navigate to project directory
mkdir BiasBuster1234
cd BiasBuster1234
```

## Step 2: Initialize Next.js Project

```bash
# Create Next.js app with TypeScript and Tailwind CSS
npx create-next-app@latest bias-buster --typescript --tailwind --app --no-src-dir --import-alias "@/*" --turbopack --no-git

# When prompted:
# - Which linter would you like to use? → ESLint
# - Would you like to use React Compiler? → No
```

## Step 3: Navigate to Project

```bash
cd bias-buster
```

## Step 4: Create Additional Folders

```bash
# Create folder structure for the application
mkdir lib
mkdir lib\types
mkdir lib\utils
mkdir components
mkdir components\ui
mkdir docs
mkdir public\uploads
```

## Step 5: Update .gitignore

Add the following to `.gitignore`:

```
# User uploads (sensitive data)
public/uploads/*
!public/uploads/.gitkeep

# Environment variables
.env
.env.local
.env.production
```

## Step 6: Install Dependencies

```bash
# Install dependencies
npm install
```

## Step 7: Run Development Server

```bash
# Start the development server
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Configuration

### Node.js Version
- Required: Node.js 18 or higher
- Check version: `node --version`

### Package Manager
- npm (default)
- Alternative: yarn or pnpm

## Next Steps

After scaffolding, you can begin implementing features:

1. Set up authentication
2. Create database schema
3. Implement file upload processing
4. Build bias detection engine
5. Integrate LLM for explanations
6. Design and build UI components

## Verification

To verify the scaffold is set up correctly:

```bash
# Check that dependencies are installed
npm list --depth=0

# Verify TypeScript compilation
npx tsc --noEmit

# Run linter
npm run lint

# Build the project
npm run build
```

All commands should complete without errors.
