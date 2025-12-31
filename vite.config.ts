import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import { copyFileSync } from 'fs';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
    process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

    const isDevelopment = mode === 'development';
    const key = process.env.VITE_KEY || 'default';
    const buildMode = process.env.VITE_BUILD_MODE || 'simple';

    // Create a unique global name for UMD based on the extension key
    const globalName = `ChurchToolsExtension_${key}`;

    console.log(`Building in ${buildMode} mode for key: ${key}`);

    const simpleBuildConfig = {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: globalName,
            formats: ['es'] as any,
            fileName: (format: string) => `extension.${format}.js`,
        },
        rollupOptions: {
            output: {
                inlineDynamicImports: true,
            },
        },
    };

    const advancedBuildConfig = {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: globalName,
            formats: ['es'] as any,
            fileName: (format: string) => `extension.${format}.js`,
        },
        rollupOptions: {
            output: {
                manualChunks: undefined,
            },
        },
        modulePreload: false,
        chunkSizeWarningLimit: 100,
    };

    return defineConfig({
        base: `/extensions/${key}/`,
        resolve: {
            alias: {
                '@': resolve(__dirname, 'src'),
            },
        },
        plugins: [
            vue(),
            !isDevelopment && {
                name: 'copy-manifest',
                closeBundle() {
                    const manifestSource = resolve(__dirname, 'manifest.json');
                    const manifestDest = resolve(__dirname, 'dist/manifest.json');
                    try {
                        copyFileSync(manifestSource, manifestDest);
                        console.log('✓ Copied manifest.json to dist/');
                    } catch (error) {
                        console.error('Failed to copy manifest.json:', error);
                    }
                },
            },
        ].filter(Boolean),
        build: isDevelopment ? {} : (buildMode === 'advanced' ? advancedBuildConfig : simpleBuildConfig),
        server: {
            port: 5173,
        },
    });
};
