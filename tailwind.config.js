import colors from 'tailwindcss/colors.js';

const rgb = hex => hex.replace('#', '').match(/.{2}/g).map(value => parseInt(value, 16)).join(' ');
const themedPalette = (family, original) => Object.fromEntries(Object.entries(original).map(([shade, hex]) =>
  [shade, `rgb(var(--brand-${family}-${shade}, ${rgb(hex)}) / <alpha-value>)`]
));

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ...Object.fromEntries(['red', 'pink', 'fuchsia', 'purple', 'violet', 'indigo', 'blue', 'sky', 'cyan'].map(name => [name, themedPalette('accent', colors[name])])),
        ...Object.fromEntries(['gray', 'slate', 'zinc', 'neutral'].map(name => [name, themedPalette('neutral', colors[name])])),
        gold: colors.amber,
        amber: colors.amber,
        yellow: colors.yellow,
      },
    },
  },
  plugins: [],
};
