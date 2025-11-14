# Library Code

This directory contains the core library code for the ChurchTools extension framework.

⚠️ **You typically don't need to modify files in this directory.**

## Files in this directory:

- **`main.ts`** - Core extension rendering system and ChurchTools client initialization
- **`loaders.ts`** - Entry point loading system (imports registry from `../entry-points/`)
- **`event-bus.ts`** - Event system for bidirectional communication

## What you should modify instead:

- **`src/entry-points/`** - Your extension's UI components (entry points)
- **`src/entry-points/index.ts`** - Registry where you add your entry points

## Adding a new entry point:

1. Create a new file in `src/entry-points/` (e.g., `my-feature.ts`)
2. Add it to the registry in `src/entry-points/index.ts`:
   ```typescript
   export const entryPointRegistry = {
       // ... other entry points
       myFeature: () => import('./my-feature'),
   };
   ```

That's it! The library code will automatically handle loading and rendering.
