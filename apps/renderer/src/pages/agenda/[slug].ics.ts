/** Fichier .ics « Ajouter à mon agenda » d'un événement (RFC 5545). */
import type { APIRoute } from 'astro';
import { getSource } from '../../lib/content';

export async function getStaticPaths() {
  return (await getSource().events()).map((e) => ({ params: { slug: e.href.split('/').pop()! } }));
}

const stamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const escape = (text: string) => text.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

export const GET: APIRoute = async ({ params }) => {
  const source = getSource();
  const [event, site] = await Promise.all([source.events().then((all) => all.find((e) => e.href === `/agenda/${params.slug}`)), source.site()]);
  if (!event) return new Response(null, { status: 404 });
  const end = event.end?.iso ?? new Date(new Date(event.start.iso).getTime() + 2 * 3600 * 1000).toISOString();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//Communeo//${escape(site.name)}//FR`,
    'BEGIN:VEVENT',
    `UID:${event.id}@${new URL(site.url).host}`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(event.start.iso)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(event.title)}`,
    ...(event.location || event.address ? [`LOCATION:${escape([event.location, event.address].filter(Boolean).join(', '))}`] : []),
    `URL:${site.url}${event.href}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return new Response(lines.join('\r\n'), { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } });
};
