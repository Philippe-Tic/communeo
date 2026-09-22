/**
 * Journalisation via le logger de Strapi, avec la même souplesse que console :
 * les arguments supplémentaires (objets, erreurs) sont formatés dans le message
 * au lieu d'être perdus par winston.
 */
import { format } from 'node:util';

type Level = 'debug' | 'info' | 'warn' | 'error';

const emit =
  (level: Level) =>
  (...args: unknown[]) => {
    const message = format(...args);
    const strapi = (globalThis as any).strapi;
    if (strapi?.log) strapi.log[level](message);
    else process.stderr.write(`[${level}] ${message}\n`);
  };

export const log = { debug: emit('debug'), info: emit('info'), warn: emit('warn'), error: emit('error') };
