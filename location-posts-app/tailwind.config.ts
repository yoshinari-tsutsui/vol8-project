import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        // Cafe theme colors for Mappuccino
        'coffee-dark': 'var(--coffee-dark)',
        'coffee-medium': 'var(--coffee-medium)',
        'coffee-light': 'var(--coffee-light)',
        'cream': 'var(--cream)',
        'espresso': 'var(--espresso)',
        'cappuccino': 'var(--cappuccino)',
        'latte': 'var(--latte)',
        'cinnamon': 'var(--cinnamon)',
        'white-foam': 'var(--white-foam)',
      },
    },
  },
  plugins: [],
}
export default config