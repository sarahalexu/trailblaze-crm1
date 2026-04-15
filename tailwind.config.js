/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // TrailBlaze brand palette
        tb: {
          purple: {
            DEFAULT: '#2b0548',
            light: '#e1b3ee',
            mid: '#63107e',
            dark: '#5a1890',
          },
          blue: '#00adef',
          gold: '#c9a54e',
          gray: '#7e7e7e',
        },
        // Health status colors
        health: {
          healthy: { bg: '#EAF3DE', text: '#3B6D11', bar: '#97C459' },
          'at-risk': { bg: '#FAEEDA', text: '#854F0B', bar: '#FAC775' },
          critical: { bg: '#FCEBEB', text: '#A32D2D', bar: '#F09595' },
        },
        // Pipeline stage colors
        stage: {
          onboarding: '#85B7EB',
          active: '#97C459',
          growth: '#AFA9EC',
          'at-risk': '#F0997B',
          renewal: '#FAC775',
          churned: '#F09595',
          lead: '#7e7e7e',
          qualified: '#85B7EB',
          proposal: '#AFA9EC',
          negotiation: '#FAC775',
          won: '#97C459',
          lost: '#F09595',
        },
        // KEEP framework colors
        keep: {
          know: '#5a1890',
          engage: '#00adef',
          exceed: '#c9a54e',
          prevent: '#1D9E75',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
