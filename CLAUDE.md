# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Quick Start
```bash
# Development (runs frontend dev server)
npm run dev

# Build production
npm run build

# Start production server
npm run start

# Run tests
npm run test

# Lint code
cd frontend && npm run lint
```

### Working with Frontend
All main development happens in the `frontend/` directory:
```bash
cd frontend
npm install     # Install dependencies
npm run dev     # Start development server on http://localhost:3000
npm run build   # Production build
npm run lint    # ESLint checking
```

## Project Architecture

### High-Level Structure
- **Root**: Contains project-wide package.json with npm script aliases
- **frontend/**: Complete Next.js 14 application with TypeScript
- **docs/**: Comprehensive technical specifications (25+ detailed docs)

### Core Technologies
- **Framework**: Next.js 14 with App Router and TypeScript
- **Styling**: Tailwind CSS + PostCSS
- **State Management**: Zustand for global state
- **Canvas System**: Custom React components with drag-and-drop
- **UI Components**: Custom components + Lucide React icons
- **Backend Integration**: Supabase client, OpenAI/Anthropic SDK ready

### Key Frontend Architecture

#### Canvas System (Core Feature)
The canvas is the heart of AICON - an interactive workspace where users create and connect content:

- **Canvas Component** (`frontend/src/components/Canvas/Canvas.tsx`): Main canvas with zoom, pan, drag-and-drop
- **Element Types**: 
  - `ContentElement`: YouTube/TikTok/Instagram content pieces
  - `ChatElement`: AI chat interfaces  
  - `FolderComponent`: Organizational containers
- **State Management**: Zustand store (`frontend/src/store/canvasStore.ts`)
- **Interactions**: Drag elements, create connections, multi-select, keyboard shortcuts

#### Type System
Comprehensive TypeScript definitions in `frontend/src/types/`:
- `canvas.ts`: Canvas-specific types (elements, connections, analysis)
- `index.ts`: Base types (platforms, positions, etc.)

#### Component Organization
```
frontend/src/components/
├── Canvas/           # Core canvas functionality
├── Chat/            # AI chat interfaces  
├── Modal/           # Modal dialogs
└── Sidebar/         # Navigation and panels
```

#### State Architecture
- **Zustand Store**: `canvasStore.ts` manages elements, connections, selections
- **Element Structure**: Each element has position, dimensions, type-specific data
- **Connection System**: Visual links between canvas elements

### AI Integration Points
- OpenAI SDK configured for content analysis
- Anthropic SDK ready for chat functionality
- Content analysis pipeline in place
- Voice/avatar generation planned (ElevenLabs, HeyGen)

### Key Development Patterns

#### Canvas Element Lifecycle
1. Element creation via toolbar drag-and-drop
2. Position/resize with custom drag handlers
3. Connection system for relating elements
4. Content analysis integration
5. Multi-select and bulk operations

#### State Updates
- Use Zustand actions for canvas operations
- Element updates trigger re-renders via React.memo
- Connection updates handled separately from elements

#### Keyboard Shortcuts
Implemented via `useKeyboardShortcuts` hook:
- Delete: Remove selected elements
- Ctrl/Cmd+A: Select all
- Ctrl/Cmd+V: Smart paste (URL detection)

## File Structure Context

### Frontend (`frontend/src/`)
- `app/`: Next.js app router pages and API routes
- `components/`: React components organized by feature
- `hooks/`: Custom React hooks for canvas interactions
- `store/`: Zustand state management
- `types/`: TypeScript type definitions
- `utils/`: Utility functions and helpers
- `lib/`: External service configurations (Supabase)

### Documentation (`docs/`)
Contains detailed technical specifications for all systems - reference these for understanding planned features and architecture decisions.

## Development Notes

### Canvas Development
- Elements use absolute positioning with viewport transforms
- Zoom/pan handled via CSS transforms on parent container  
- Drag operations use custom hooks with debouncing
- Connection lines rendered as SVG paths

### State Management Best Practices
- Use Zustand actions for all state modifications
- Keep element updates granular to optimize re-renders
- Handle selections separately from element data

### Adding New Element Types
1. Extend `CanvasElementType` union in `types/canvas.ts`
2. Create component in `components/Canvas/`
3. Add rendering logic to main `Canvas.tsx`
4. Update Zustand store actions as needed

### AI Content Analysis
- Analysis triggered automatically on content elements
- Results stored in element metadata
- Re-analysis available via context menu
- Error handling for failed analysis requests