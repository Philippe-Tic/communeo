import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  integrations: [
    starlight({
      title: "Communeo — Documentation",
      customCss: ["./src/custom.css"],
      defaultLocale: "root",
      locales: {
        root: { label: "Français", lang: "fr" },
      },
      // Même arborescence que le menu de l'administration
      sidebar: [
        {
          label: "Premiers pas",
          items: [
            { label: "Présentation", slug: "premiers-pas/presentation" },
            { label: "Se connecter", slug: "premiers-pas/connexion" },
            { label: "L'assistant de démarrage", slug: "premiers-pas/assistant" },
            { label: "Le tableau de bord", slug: "premiers-pas/tableau-de-bord" },
          ],
        },
        {
          label: "Écrire et publier",
          items: [
            { label: "L'éditeur de contenu", slug: "publier/editeur" },
            { label: "Les blocs", slug: "publier/blocs" },
            { label: "Publier, programmer, historique", slug: "publier/publication" },
            { label: "Mettre en ligne", slug: "publier/mise-en-ligne" },
          ],
        },
        {
          label: "Contenus",
          items: [
            { label: "Pages", slug: "contenus/pages" },
            { label: "Actualités", slug: "contenus/actualites" },
            { label: "Agenda", slug: "contenus/agenda" },
            { label: "Documents officiels", slug: "contenus/documents" },
            { label: "Équipe municipale", slug: "contenus/equipe" },
            { label: "Associations", slug: "contenus/associations" },
          ],
        },
        {
          label: "Vie pratique",
          items: [
            { label: "Alertes", slug: "vie-pratique/alertes" },
            { label: "Collecte des déchets", slug: "vie-pratique/dechets" },
            { label: "Cantine", slug: "vie-pratique/cantine" },
          ],
        },
        {
          label: "Habitants",
          items: [
            { label: "Messages", slug: "habitants/messages" },
            { label: "Lettre d'information", slug: "habitants/newsletter" },
          ],
        },
        { label: "Médiathèque", slug: "mediatheque" },
        {
          label: "Mon site",
          items: [
            { label: "Apparence", slug: "mon-site/apparence" },
            { label: "Page d'accueil", slug: "mon-site/accueil" },
            { label: "Menu du site", slug: "mon-site/menu" },
            { label: "Informations de la commune", slug: "mon-site/informations" },
            { label: "Mentions légales et données personnelles", slug: "mon-site/legal" },
            { label: "Accessibilité", slug: "mon-site/accessibilite" },
            { label: "Réseaux sociaux, démarches, open data", slug: "mon-site/autres-reglages" },
          ],
        },
        {
          label: "Administration",
          items: [
            { label: "Conformité", slug: "administration/conformite" },
            { label: "Utilisateurs", slug: "administration/utilisateurs" },
            { label: "Journal d'activité", slug: "administration/journal" },
            { label: "Mon compte", slug: "administration/mon-compte" },
          ],
        },
        { label: "Équipe Communeo", slug: "equipe-communeo" },
        { label: "Créer un thème (développeurs)", slug: "developpeurs/creer-un-theme" },
      ],
    }),
  ],
});
