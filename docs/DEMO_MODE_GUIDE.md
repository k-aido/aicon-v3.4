# AICON Demo Mode Guide

## Overview

Demo Mode is a simplified, single-account development environment optimized for rapid testing and development. It bypasses complex authentication and RLS policies to provide a frictionless canvas creation experience.

## Quick Start

### 1. Database Setup

Run the complete demo setup script in your Supabase SQL editor:

```sql
-- File: database/demo-mode/01_complete_demo_setup.sql
```

This script:
- Creates demo account and user
- Disables RLS for demo tables
- Sets up permissive policies
- Creates helper functions
- Initializes demo data

### 2. Environment Configuration

Copy the demo environment file:

```bash
cp .env.demo .env.local
```

Update with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_DEMO_MODE=true
```

### 3. Start Development

```bash
npm run dev
```

Access demo mode:
- Direct: `http://localhost:3000?demo=true`
- Or set `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local`

## Architecture

### Demo IDs

- **Account ID**: `550e8400-e29b-41d4-a716-446655440001`
- **User ID**: `550e8400-e29b-41d4-a716-446655440002`
- **Main Project ID**: `550e8400-e29b-41d4-a716-446655440003`

### Service Layers

1. **demoCanvasService** - Simplified canvas operations
2. **DemoModeProvider** - React context for demo state
3. **useDemoMode** - Hook for demo utilities
4. **DemoDashboard** - Optimized dashboard for demo

### Database Configuration

Demo mode disables RLS by default for easier development:

```sql
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_elements DISABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_connections DISABLE ROW LEVEL SECURITY;
```

## Features

### Canvas Management

- **Unlimited Canvases**: No restrictions on canvas creation
- **Auto-Save**: Enabled by default with 2-second interval
- **Quick Actions**: Duplicate, delete, reset functionality
- **Clean URLs**: `/canvas/[id]` format

### Development Tools

- **Reset Function**: `reset_demo_data()` clears all test data
- **Debug Mode**: Enhanced logging when enabled
- **Demo Banner**: Visual indicator of demo mode
- **Canvas Counter**: Track created canvases

## Usage Examples

### Creating a Canvas

```typescript
// Using the service directly
const canvasId = await demoCanvasService.createCanvas('My Test Canvas');

// Using the hook
const { createDemoCanvas } = useDemoMode();
const canvasId = await createDemoCanvas('My Test Canvas');
```

### Loading Canvases

```typescript
// Get all canvases
const canvases = await demoCanvasService.getAllCanvases();

// Load specific canvas
const canvasData = await demoCanvasService.loadCanvas(canvasId);
```

### Saving Canvas State

```typescript
await demoCanvasService.saveCanvas(
  canvasId,
  elements,
  connections,
  viewport
);
```

### Resetting Demo Data

```sql
-- Via SQL
SELECT reset_demo_data();

-- Via TypeScript
await demoCanvasService.resetDemoData();
```

## Best Practices

### Development Workflow

1. **Start Fresh**: Run reset script at beginning of session
2. **Test Features**: Create multiple canvases for different tests
3. **Clean Up**: Reset data before committing changes
4. **Use Demo IDs**: Always use the provided demo IDs

### Performance Tips

1. **Batch Operations**: Save canvas state in batches
2. **Debounce Saves**: Auto-save uses 2-second delay
3. **Limit Elements**: Keep under 1000 elements per canvas
4. **Clean Storage**: Reset periodically to maintain performance

### Error Handling

Demo mode provides detailed logging:

```typescript
console.log('[DemoCanvasService] Creating canvas:', title);
console.log('[DemoCanvasService] ✅ Canvas created:', id);
console.error('[DemoCanvasService] ❌ Error:', error);
```

## Troubleshooting

### Common Issues

1. **"Table not found"**
   - Run the setup script: `01_complete_demo_setup.sql`

2. **"RLS policy violation"**
   - RLS should be disabled in demo mode
   - Check if policies were recreated

3. **"Cannot create canvas"**
   - Verify demo account exists
   - Check browser console for errors

4. **"Canvas not loading"**
   - Ensure canvas_data JSONB field is valid
   - Check for null elements/connections

### Debug Commands

```sql
-- Check demo account
SELECT * FROM accounts WHERE id = '550e8400-e29b-41d4-a716-446655440001';

-- List all demo canvases
SELECT * FROM demo_canvases;

-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('projects', 'canvas_elements');
```

## Migration to Production

When ready for production:

1. **Enable RLS**: Re-enable row level security
2. **Update Policies**: Create proper RLS policies
3. **Add Auth**: Integrate Supabase Auth
4. **Remove Demo**: Delete demo-specific code
5. **Update IDs**: Use real user/account IDs

## API Reference

### demoCanvasService

- `getAllCanvases()`: Get all demo canvases
- `createCanvas(title?)`: Create new canvas
- `loadCanvas(id)`: Load canvas data
- `saveCanvas(id, elements, connections, viewport?)`: Save canvas
- `deleteCanvas(id)`: Delete canvas
- `duplicateCanvas(id, title?)`: Duplicate canvas
- `resetDemoData()`: Reset all demo data
- `getCanvasCount()`: Get total canvas count

### useDemoMode Hook

- `isDemoMode`: Boolean flag
- `demoUserId`: Demo user ID
- `demoAccountId`: Demo account ID
- `createDemoCanvas(title?)`: Create and navigate
- `resetDemoData()`: Reset and reload
- `enableDemoMode()`: Enable via URL
- `disableDemoMode()`: Disable demo mode

## Conclusion

Demo Mode provides a streamlined development experience for AICON. It removes authentication barriers, simplifies database operations, and enables rapid iteration on canvas features. Perfect for development, testing, and preparing for Instagram content integration.