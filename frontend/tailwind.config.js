/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            keyframes: {
                scan: {
                    '0%': { backgroundPosition: '0 -100vh' },
                    '100%': { backgroundPosition: '0 100vh' },
                }
            },
            animation: {
                scan: 'scan 2s linear infinite',
            }
        },
    },
    plugins: [],
}
