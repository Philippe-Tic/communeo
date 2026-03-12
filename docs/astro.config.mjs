import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  integrations: [
    starlight({
      title: "CMS Mairies — Documentation",
      defaultLocale: "root",
      locales: {
        root: { label: "Français", lang: "fr" },
      },
    }),
  ],
});
