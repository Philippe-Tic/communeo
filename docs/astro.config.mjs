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
      sidebar: [
        {
          label: "Guide de démarrage",
          items: [
            { label: "Présentation", slug: "guide/presentation" },
            { label: "Connexion et navigation", slug: "guide/connexion" },
          ],
        },
        {
          label: "Gestion de contenu",
          items: [
            { label: "Tableau de bord", slug: "contenu/tableau-de-bord" },
            { label: "Actualités", slug: "contenu/actualites" },
            { label: "Pages", slug: "contenu/pages" },
            { label: "Événements", slug: "contenu/evenements" },
            {
              label: "Documents officiels",
              slug: "contenu/documents-officiels",
            },
            { label: "Alertes", slug: "contenu/alertes" },
            {
              label: "Collecte des déchets",
              slug: "contenu/collecte-dechets",
            },
            { label: "Cantine", slug: "contenu/cantine" },
            { label: "Médiathèque", slug: "contenu/mediatheque" },
          ],
        },
        {
          label: "Communauté",
          items: [
            { label: "Messages", slug: "communaute/messages" },
            { label: "Équipe municipale", slug: "communaute/equipe" },
            { label: "Associations", slug: "communaute/associations" },
            { label: "Newsletter", slug: "communaute/newsletter" },
          ],
        },
        {
          label: "Configuration du site",
          items: [
            {
              label: "Informations générales",
              slug: "configuration/informations-generales",
            },
            {
              label: "Mentions légales & RGPD",
              slug: "configuration/mentions-legales-rgpd",
            },
            {
              label: "Accueil & Navigation",
              slug: "configuration/accueil-navigation",
            },
            {
              label: "Réseaux sociaux",
              slug: "configuration/reseaux-sociaux",
            },
          ],
        },
        {
          label: "Administration",
          items: [
            {
              label: "Conformité légale",
              slug: "administration/conformite-legale",
            },
            { label: "Déploiement", slug: "administration/deploiement" },
            {
              label: "Domaine personnalisé",
              slug: "administration/domaine-personnalise",
            },
            { label: "Utilisateurs", slug: "administration/utilisateurs" },
            { label: "Profil", slug: "administration/profil" },
          ],
        },
        {
          label: "Référence",
          items: [
            { label: "Éditeur de texte", slug: "reference/editeur-texte" },
            { label: "Astuces", slug: "reference/astuces" },
          ],
        },
      ],
    }),
  ],
});
