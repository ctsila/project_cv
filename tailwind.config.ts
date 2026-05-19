import type { Config } from 'tailwindcss';
const config: Config = { content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'], theme: { extend: { colors: { ink: '#07111f', mint: '#20d3ba', sky: '#3b82f6' }, boxShadow: { soft: '0 18px 55px rgba(15,23,42,.10)' } } }, plugins: [] };
export default config;
