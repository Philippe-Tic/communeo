/** Flux RSS des actualités de la commune (lien déclaré dans le <head> de chaque page). */
import type { APIRoute } from 'astro';
import { getSource } from '../lib/content';

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = async () => {
  const source = getSource();
  const [site, articles] = await Promise.all([source.site(), source.articles()]);
  const items = articles
    .slice(0, 30)
    .map((article) =>
      [
        '    <item>',
        `      <title>${escape(article.title)}</title>`,
        `      <link>${site.url}${article.href}</link>`,
        `      <guid isPermaLink="true">${site.url}${article.href}</guid>`,
        `      <pubDate>${new Date(article.date.iso).toUTCString()}</pubDate>`,
        `      <category>${escape(article.category.label)}</category>`,
        ...(article.summary ? [`      <description>${escape(article.summary)}</description>`] : []),
        '    </item>',
      ].join('\n'),
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Actualités – ${escape(site.name)}</title>
    <link>${site.url}/actualites</link>
    <description>Les actualités de la commune de ${escape(site.name)}</description>
    <language>fr</language>
    <atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
