/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {},
    },
    // Scope all Tailwind styles to the extension root div
    // This prevents Tailwind's preflight (reset) from breaking ChurchTools UI
    // and prevents ChurchTools styles from breaking the extension (mostly)
    important: '#time-tracker-root',
    plugins: [],
}
