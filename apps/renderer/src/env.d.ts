/// <reference types="astro/client" />

declare module 'virtual:communeo/theme' {
  const theme: import('@communeo/theme-contract').Theme;
  export default theme;
}
