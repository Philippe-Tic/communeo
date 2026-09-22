/// <reference types="astro/client" />

declare module 'virtual:communeo/theme' {
  import type { Theme } from '@communeo/theme-contract';
  const theme: Theme;
  export default theme;
}
