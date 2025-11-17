# Source Code Structure

This directory contains the source code for your ChurchTools extension.

## Directory Structure

```
src/
├── lib/                    ⚠️ Library code (don't modify)
│   ├── main.ts            - Core rendering system
│   ├── loaders.ts         - Entry point loader
│   ├── event-bus.ts       - Event system
│   └── README.md          - Library documentation
│
├── entry-points/           ✏️ Your extension implementation (edit this!)
│   ├── index.ts           - Entry point registry
│   ├── main.ts            - Main module entry point (delete it, if your extension does not need it)
│   ├── admin.ts           - Admin configuration entry point (delete it, if your extension does not need it)
│   ├── ...                - Other entry points that your extension provides
│   └── README.md          - How to add entry points
│
├── types/                  📝 TypeScript type definitions
│   └── extension.ts       - Core extension types
│
├── utils/                  🔧 Utility files
│   ├── ct-types.d.ts      - ChurchTools API types
│   └── reset.css          - CSS reset for development
│
└── index.ts                📦 Main entry point (re-exports everything)
```

## What to Edit

### ✏️ To add a new feature:

1. **Create an entry point file** in `src/entry-points/`
   ```typescript
   // src/entry-points/my-feature.ts
   import type { EntryPoint } from '../lib/main';

   const myFeatureEntryPoint: EntryPoint = ({ element, user }) => {
       element.innerHTML = `<h1>Hello ${user.firstName}!</h1>`;
   };

   export { myFeatureEntryPoint };
   export default myFeatureEntryPoint;
   ```

2. **Register it** in `src/entry-points/index.ts`:
   ```typescript
   export const entryPointRegistry = {
       // ...
       myFeature: () => import('./my-feature'),
   };
   ```

3. **Add to `manifest.json`** (required for `npm run dev` and ChurchTools):
   ```json
   {
     "extensionPoints": [
       {
         "id": "some-extension-point-id",
         "entryPoint": "myFeature",
         "title": "My Feature",
         "description": "Description of my feature"
       }
     ]
   }
   ```

4. **Build and test**:
   ```bash
   npm run build
   npm run dev
   ```

### 📋 To use extension point types:

Extension point type definitions are provided by the `@churchtools/extension-points` package:

```typescript
import type { MainModuleData, AdminData } from '@churchtools/extension-points';
import type { EntryPoint } from '../lib/main';

const myEntryPoint: EntryPoint<MainModuleData> = ({ data, on, emit }) => {
    // Type-safe access to data
    console.log(data.userId, data.permissions);
};
```

See the package documentation for all available extension point types.

### 🔧 To add utilities:

Add helper functions, types, or styles to `src/utils/`

## What NOT to Edit

### ⚠️ Library code (`src/lib/`)

These files are part of the framework and handle:
- Extension initialization
- Entry point loading
- Event communication
- ChurchTools client setup

You typically don't need to modify these files.

## Main Entry Points

The boilerplate includes two main entry points:

- **`main.ts`** - Standalone module with its own menu entry
  - Use for full-featured extensions

- **`admin.ts`** - Admin configuration panel
  - Use for extension settings

You can customize these or create your own!

## Development Workflow

1. **Edit entry points** in `src/entry-points/`
2. **Register them** in `src/entry-points/index.ts`
3. **Add to `manifest.json`** (required for testing and ChurchTools)
4. **Test locally**: `npm run dev`
5. **Build**: `npm run build`
6. **Deploy**: `npm run deploy`

## Type Safety

Use TypeScript interfaces from @churchtools/extension-points for type-safe access to data and events:

```typescript
import type { EntryPoint } from '../lib/main';
import type { SomeExtensionPointData } from '@churchtools/extension-points/some-extension-point';

// Use in entry point
const myEntryPoint: EntryPoint<SomeExtensionPointData> = ({ data }) => {
    console.log(data.userId);  // ✅ Type-safe!
};
```

## Complete Documentation

For comprehensive documentation, see the `docs/` folder:

- **[Getting Started](../docs/getting-started.md)** - Complete setup guide and tutorial
- **[Core Concepts](../docs/core-concepts.md)** - Understanding extension architecture
- **[Entry Points Guide](../docs/entry-points.md)** - Creating and managing entry points
- **[Communication](../docs/communication.md)** - Event-based communication
- **[Build & Deploy](../docs/build-and-deploy.md)** - Building and deployment
- **[API Reference](../docs/api-reference.md)** - Complete API documentation

See also:
- `src/entry-points/README.md` - Entry point examples
- `src/lib/README.md` - Library documentation
- Root `README.md` - Quick start guide
