# Entry Points

This directory contains your extension's entry points - the UI components that can be rendered in various locations within ChurchTools.

## Adding a New Entry Point

### 1. Create your entry point file

Create a new TypeScript file in this directory (e.g., `my-feature.ts`):

```typescript
import type { EntryPoint } from '../lib/main';

// Import the data interface from @churchtools/extension-points (optional, but recommended for type safety)
import type { SomeExtensionPointData } from '@churchtools/extension-points/some-extension-point';

const myFeatureEntryPoint: EntryPoint<SomeExtensionPointData> = ({
    data,
    on,
    off,
    emit,
    element,
    user,
    churchtoolsClient,
}) => {
    console.log('[My Feature] Initializing');

    // Render your UI
    element.innerHTML = `
        <div style="padding: 2rem;">
            <h1>My Feature</h1>
            <p>Hello, ${user.firstName}!</p>
        </div>
    `;

    // Listen to events from ChurchTools
    const handleUpdate = (newData: any) => {
        console.log('Data updated:', newData);
    };
    on('data:updated', handleUpdate);

    // Return cleanup function
    return () => {
        console.log('[My Feature] Cleaning up');
        off('data:updated', handleUpdate);
    };
};

// Named export for simple mode
export { myFeatureEntryPoint };

// Default export for advanced mode (required!)
export default myFeatureEntryPoint;
```

### 2. Register it in index.ts

Open `index.ts` and add your entry point to the registry:

```typescript
export const entryPointRegistry: Record<string, EntryPointLoader> = {
    // ... existing entry points

    // Add your new entry point:
    myFeature: () => import('./my-feature'),
};
```

### 3. Add to manifest.json

**Important:** You must add your entry point to `manifest.json` in the root directory for it to be recognized by `npm run dev` and ChurchTools:

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

Where:
- `id` is the ChurchTools extension point ID (e.g., `main`, `admin`, `appointment-dialog-tab`)
- `entryPoint` must match the key in your entry point registry (`myFeature`)
- `title` and `description` are displayed in development UI

### 4. That's it!

Your entry point is now ready to use:

```typescript
import { renderExtension, loadEntryPoint } from '/ccm/yourkey/extension.es.js';

const entryPoint = await loadEntryPoint('myFeature');
await renderExtension('my-div', entryPoint, {
    userId: 123,
    someSettings: { enabled: true }
});
```

## Example Entry Points

This directory contains several example entry points:

- **`main.ts`** - Main view with a dashboard
- **`admin.ts`** - Admin configuration panel
- **`appointment-details.ts`** - Additional data display in appointment edit dialog

Feel free to study these examples and modify or remove them for your extension.

## Entry Point Structure

Every entry point should follow this pattern:

```typescript
import type { EntryPoint } from '../lib/main';

// 1. Import the correct data interface from @churchtools/extension-points (optional, but recommended for type safety)
import type { SomeExtensionPointData } from '@churchtools/extension-points/some-extension-point';

// 2. Create entry point function
const myEntryPoint: EntryPoint<SomeExtensionPointData> = (context) => {
    const { data, on, off, emit, element, user, churchtoolsClient } = context;

    // 3. Render UI
    element.innerHTML = `...`;

    // 4. Set up event listeners
    on('some:event', handler);

    // 5. Return cleanup function (optional)
    return () => {
        off('some:event', handler);
    };
};

// 6. Export (both named and default!)
export { myEntryPoint };
export default myEntryPoint;
```

## Tips

- **Always export as default** - Required for code splitting in advanced mode
- **Return cleanup functions** - Properly clean up event listeners and resources
- **Use TypeScript types** - Better developer experience and fewer bugs
- **Test with both build modes** - Run `npm run build:simple` and `npm run build:advanced`

## Complete Documentation

For comprehensive guides, see the `docs/` folder:

- **[Getting Started](../../docs/getting-started.md)** - Tutorial with complete examples
- **[Entry Points Guide](../../docs/entry-points.md)** - Detailed entry points documentation
- **[Communication](../../docs/communication.md)** - Event communication patterns
- **[API Reference](../../docs/api-reference.md)** - Full API documentation
