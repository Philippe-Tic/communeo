import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getArticles, getSiteConfig } from '../utils/strapi';

export async function GET(context: APIContext) {
  const siteConfig = await getSiteConfig();
  const articles = await getArticles();

  return rss({
    title: siteConfig.name || 'Site de la mairie',
    description: `Actualités de ${siteConfig.name || 'votre mairie'}`,
    site: context.site?.toString() || '',
    items: articles.map((article) => ({
      title: article.title,
      pubDate: article.publication_date ? new Date(article.publication_date) : new Date(article.createdAt),
      description: article.summary || article.meta_description || '',
      link: `/actualites/${article.slug}`,
    })),
    customData: '<language>fr-FR</language>',
  });
}
