import { base } from '@blotter/config/eslint';
import globals from 'globals';

export default [
  ...base,
  { languageOptions: { globals: { ...globals.browser } } },
  { ignores: ['next-env.d.ts'] },
];
