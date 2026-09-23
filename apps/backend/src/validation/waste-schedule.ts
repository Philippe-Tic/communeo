/**
 * Cohérence d'une collecte de déchets : un jour de passage est obligatoire, sauf pour l'apport
 * volontaire et le rendez-vous (alors retiré) ; le rang dans le mois ne vaut que pour une collecte
 * mensuelle ; une saison a ses deux mois ou aucun.
 */
import { errors } from '@strapi/utils';
import { WASTE_FREQUENCIES_WITHOUT_DAY } from '@communeo/core';

const UID = 'api::waste-schedule.waste-schedule';

export const wasteScheduleMiddleware = (strapi: any) => async (ctx: any, next: () => Promise<any>) => {
  if (ctx.uid !== UID || (ctx.action !== 'create' && ctx.action !== 'update')) return next();
  const data = ctx.params?.data ?? {};
  // Modification partielle : la valeur enregistrée complète celles envoyées
  const current = ctx.action === 'update' && ctx.params?.documentId ? await strapi.documents(UID).findOne({ documentId: ctx.params.documentId }) : null;
  const value = (field: string) => (field in data ? data[field] : current?.[field]) ?? null;

  const frequency = value('frequency') ?? 'hebdomadaire';
  const problems: Array<{ path: string[]; message: string }> = [];
  if (WASTE_FREQUENCIES_WITHOUT_DAY.includes(frequency)) {
    data.collection_day = null;
  } else if (!value('collection_day')) {
    problems.push({ path: ['collection_day'], message: 'Choisissez le jour de collecte' });
  }
  if (frequency !== 'mensuel') data.month_rank = null;
  const start = value('season_start_month');
  const end = value('season_end_month');
  if ((start === null) !== (end === null)) problems.push({ path: [start === null ? 'season_start_month' : 'season_end_month'], message: 'Indiquez le premier et le dernier mois de la saison' });

  if (problems.length) {
    throw new errors.ValidationError(problems[0]!.message, { errors: problems.map((problem) => ({ ...problem, name: 'ValidationError' })) });
  }
  ctx.params.data = data;
  return next();
};
