import {defineConfig} from 'vite';
export default defineConfig({
  base: process.env.GITHUB_ACTIONS === 'true'
    ? '/Center-of-Gravity-Calculator-V2/'
    : '/',
});
