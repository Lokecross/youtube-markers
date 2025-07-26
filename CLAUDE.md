# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome extension template built with React, TypeScript, and Vite. The project creates a popup-style Chrome extension that displays a React application when the extension icon is clicked.

## Package Manager

This project uses **pnpm** as the package manager (specified in package.json). Always use `pnpm` commands instead of `npm`:

```bash
pnpm install      # Install dependencies
pnpm run dev      # Start development server
pnpm run build    # Build for production
pnpm run lint     # Run ESLint
pnpm run preview  # Preview production build
```

## Development Commands

- **Development**: `pnpm run dev` - Starts Vite dev server for local development
- **Build**: `pnpm run build` - TypeScript compilation + Vite build, outputs to `build/` directory
- **Lint**: `pnpm run lint` - ESLint with TypeScript support, treats warnings as errors
- **Preview**: `pnpm run preview` - Preview the production build locally

## Chrome Extension Architecture

### Manifest Configuration
- Uses **Manifest V3** (latest Chrome extension format)
- Extension type: **popup** (action.default_popup points to index.html)
- Currently has no permissions defined
- Built files are placed in `build/` directory for loading as unpacked extension

### Build Process
- Vite builds the React app and outputs to `build/` directory
- `vite-plugin-static-copy` copies `manifest.json` from `public/` to build output
- The `build/` directory contains everything needed to load the extension in Chrome

### Loading the Extension
1. Build the project: `pnpm run build`
2. Open Chrome → `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" → select the `build/` directory

## Code Architecture

### Entry Point
- `src/main.tsx` - React app entry point, renders App component to DOM
- `index.html` - Main HTML file that serves as the extension popup

### TypeScript Configuration
- Uses TypeScript 5.2+ with strict mode
- Separate configs: `tsconfig.app.json` (app code) and `tsconfig.node.json` (build tools)
- Vite environment types included via `src/vite-env.d.ts`

### Styling & Assets
- CSS modules and standard CSS supported
- Static assets in `src/assets/` and `public/`
- Vite handles asset optimization and imports

## Extension-Specific Considerations

- The React app runs in the extension popup context (limited to ~600x400px typically)
- No background scripts or content scripts are currently configured
- To add Chrome extension APIs, update `manifest.json` permissions and use `chrome.*` APIs in TypeScript
- For content scripts or background scripts, you'll need to modify the Vite build configuration to support multiple entry points