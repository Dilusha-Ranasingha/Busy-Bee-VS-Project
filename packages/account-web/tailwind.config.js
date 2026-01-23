/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        vscode: {
          bg: {
            light: '#ffffff',
            dark: '#1e1e1e',
          },
          sidebarBg: {
            light: '#f3f3f3',
            dark: '#252526',
          },
          editorBg: {
            light: '#ffffff',
            dark: '#1e1e1e',
          },
          border: {
            light: '#e5e7eb',
            dark: '#3e3e42',
          },
          text: {
            light: '#3b3b3b',
            dark: '#cccccc',
          },
          textMuted: {
            light: '#6b7280',
            dark: '#858585',
          },
          accent: {
            light: '#007acc',
            dark: '#007acc',
          },
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        silver: {
          400: '#d4d4d8',
          500: '#a1a1aa',
          600: '#71717a',
        },
        bronze: {
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
        }
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'bounce-slow': 'bounce 3s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scale-in': 'scaleIn 0.5s ease-out',
        'glow': 'glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shine': 'shine 1.5s ease-in-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 122, 204, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 122, 204, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shine: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      }
    },
  },
  plugins: [],
}
