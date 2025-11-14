# Entry Points

This directory contains your extension's entry points - the UI components that can be rendered in various locations within ChurchTools.

## Adding a New Entry Point

### 1. Create your entry point file

Create a new TypeScript file in this directory (e.g., `my-feature.ts`):

```typescript
import type { EntryPoint } from '../lib/main';

// Define your data interface (optional, but recommended for type safety)
interface MyFeatureData {
    userId: number;
    someSettings: any;
}

const myFeatureEntryPoint: EntryPoint<MyFeatureData> = ({
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

### 3. That's it!

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

- **`welcome.ts`** - Simple welcome screen
- **`user-info.ts`** - Displays current user information
- **`data-viewer.ts`** - Fetches and displays data from ChurchTools API
- **`calendar-availability.ts`** - Calendar integration with events
- **`main.ts`** - Full-featured module with navigation
- **`admin.ts`** - Admin configuration panel

Feel free to study these examples and modify or remove them for your extension.

## Entry Point Structure

Every entry point should follow this pattern:

```typescript
import type { EntryPoint } from '../lib/main';

// 1. Define data interface (optional but recommended)
interface MyData {
    // ...
}

// 2. Create entry point function
const myEntryPoint: EntryPoint<MyData> = (context) => {
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
