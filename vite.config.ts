import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default ({ mode }) => {
    process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

    const isDevelopment = mode === 'development';
    const key = process.env.VITE_KEY || 'default';

    // Create a unique global name for UMD based on the extension key
    // This prevents namespace collisions when multiple extensions are loaded
    const globalName = `ChurchToolsExtension_${key}`;

    return defineConfig({
        base: `/ccm/${key}/`,
        build: isDevelopment ? {} : {
            lib: {
                // Entry point for the library
                entry: resolve(__dirname, 'src/index.ts'),
                name: globalName,
                // Generate both ES module and UMD formats
                formats: ['es', 'umd'],
                fileName: (format) => `extension.${format}.js`,
            },
            rollupOptions: {
                // Externalize dependencies that shouldn't be bundled
                external: ['@churchtools/churchtools-client'],
                output: {
                    // Provide global variables for externalized deps in UMD build
                    globals: {
                        '@churchtools/churchtools-client': 'ChurchToolsClient',
                    },
                },
            },
        },
    });
};
