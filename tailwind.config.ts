import type { Config } from 'tailwindcss'
import animatePlugin from 'tailwindcss-animate'
import typographyPlugin from '@tailwindcss/typography'
import defaultTheme from 'tailwindcss/defaultTheme'

const config: Config = {
  darkMode: ['class'],
  content: ['./pages/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    fontFamily: {
      ...defaultTheme.fontFamily,
      sans: ['var(--font-inter)'],
    },
    screens: {
      xs: '490px',
      ...defaultTheme?.screens,
    },
    container: {
      center: true,
      padding: '2rem',
      screens: {
        xs: '490px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '	1280px',
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgba(var(--primary), <alpha-value>)',
        },
        'primary-black': {
          DEFAULT: 'rgba(var(--primary-black), <alpha-value>)',
        },
      },
    },
  },
  plugins: [animatePlugin, typographyPlugin],
}
export default config
