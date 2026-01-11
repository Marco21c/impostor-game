/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                game: {
                    bg: '#0f172a',      // slate-900
                    surface: '#1e293b', // slate-800
                    primary: '#3b82f6', // blue-500
                    secondary: '#64748b', // slate-500
                    accent: '#ef4444',  // red-500
                    text: '#f1f5f9',    // slate-100
                    muted: '#94a3b8',   // slate-400
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
