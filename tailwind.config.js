/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // ---- Font ----
      // global.css: font-family trên :root
      fontFamily: {
        sans: ['Be Vietnam Pro', 'Segoe UI', 'sans-serif'],
      },

      // ---- Màu sắc ----
      // Map lại các custom property (--accent, --ink, --muted, --border, --green, --orange-soft)
      // cùng các màu phụ dùng lặp lại nhiều lần trong global.css (badge, text, nền...)
      colors: {
        accent: {
          DEFAULT: '#ed641c',
          dark: '#cb4c0e',
        },
        ink: '#26303d',
        muted: '#818794',
        border: '#e9ebee',
        green: {
          DEFAULT: '#358b6c',
          text: '#377e60',
        },
        orange: {
          soft: '#fff2e9',
          text: '#d27332',
          badge: '#b16b36',
        },
        blue: {
          text: '#4d78a6',
        },
        purple: {
          text: '#8763aa',
        },
        surface: {
          DEFAULT: '#f8f9fb', // body background
          card: '#ffffff',
        },
        // Các sắc thái text/nền xám-xanh dùng cho phần "contrast fix" cuối file
        slate: {
          text: '#717d8d',
          th: '#7b8797',
          tab: '#758293',
          select: '#718094',
          field: '#63738a',
        },
      },

      // ---- Border radius ----
      // Các giá trị lặp lại nhiều nhất trong global.css
      borderRadius: {
        sm: '5px',
        DEFAULT: '7px',
        md: '8px',
        lg: '9px',
        xl: '10px',
        '2xl': '12px',
        '3xl': '14px',
      },

      // ---- Box shadow ----
      // Các shadow đặc trưng xuất hiện trong global.css (card, modal, dropdown...)
      boxShadow: {
        card: '0 1px 2px #00000002',
        soft: '0 4px 16px #a4815615',
        hover: '0 8px 14px #ab764318',
        accent: '0 2px 3px #c9631815',
        modal: '0 25px 100px #25314428',
        panel: '0 8px 40px #1730231a',
        'focus-ring': '0 0 0 2px white',
      },

      // ---- Breakpoint tuỳ chỉnh ----
      // Lấy từ các @media query trong global.css (ngoài breakpoint mặc định của Tailwind)
      screens: {
        xs: '480px',
        '3xl': '1500px', // dùng cho @media (min-width: 1500px) -> viết dạng min-3xl:...
      },

      // ---- Animation ----
      // .spin { animation: spin 1s linear infinite; }
      keyframes: {
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        spin: 'spin 1s linear infinite',
      },

      // ---- Kích thước layout cố định ----
      // .sidebar { width: 245px } / .main-shell { margin-left: 245px } / .topbar { height: 66px }
      spacing: {
        sidebar: '245px',
        topbar: '66px',
        brand: '87px',
      },
    },
  },
  plugins: [],
};