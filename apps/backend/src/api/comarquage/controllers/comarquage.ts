import comarquageService from '../../../services/comarquage'
import type { DilaAudience } from '../../../types/comarquage'

const VALID_AUDIENCES = ['particuliers', 'professionnels'] as const

function validateAudience(ctx: any): DilaAudience | null {
  const { audience } = ctx.params
  if (!VALID_AUDIENCES.includes(audience)) {
    ctx.badRequest(`Audience invalide: "${audience}". Valeurs acceptées: ${VALID_AUDIENCES.join(', ')}`)
    return null
  }
  return audience as DilaAudience
}

export default {
  async categories(ctx: any) {
    const audience = validateAudience(ctx)
    if (!audience) return

    try {
      const result = await comarquageService.getMenu(audience)
      ctx.body = {
        data: result.themes,
        meta: { audience: result.audience, cacheAge: result.cacheAge, stale: result.stale },
      }
    } catch (error: any) {
      ctx.internalServerError(`Erreur lors de la récupération des catégories: ${error.message}`)
    }
  },

  async fiche(ctx: any) {
    const audience = validateAudience(ctx)
    if (!audience) return

    const { ficheId } = ctx.params
    if (!ficheId || !/^[A-Z][0-9]+$/.test(ficheId)) {
      return ctx.badRequest('ID de fiche invalide. Format attendu: lettre majuscule suivie de chiffres (ex: F1, N123)')
    }

    try {
      const result = await comarquageService.getFiche(ficheId, audience)
      if (!result) {
        return ctx.notFound(`Fiche "${ficheId}" introuvable pour l'audience "${audience}"`)
      }
      ctx.body = {
        data: result.fiche,
        meta: { cacheAge: result.cacheAge, stale: result.stale },
      }
    } catch (error: any) {
      ctx.internalServerError(`Erreur lors de la récupération de la fiche: ${error.message}`)
    }
  },

  /** Recherche publique dans toutes les démarches (sites des communes) : `?q=` et `?limit=` (50 au plus) */
  async search(ctx: any) {
    const audience = validateAudience(ctx)
    if (!audience) return

    const q = String(ctx.query.q ?? '').trim().slice(0, 100)
    if (!q) {
      return ctx.badRequest('Le paramètre de recherche "q" est requis')
    }
    const limit = Math.min(Math.max(parseInt(String(ctx.query.limit ?? '20'), 10) || 20, 1), 50)

    try {
      const { total, results } = await comarquageService.search(audience, q, limit)
      // Réponse identique pour tous les visiteurs : les navigateurs et proxys peuvent la garder
      ctx.set('Cache-Control', 'public, max-age=300')
      ctx.body = {
        data: results.map(({ id, title, description, context, kind }) => ({ id, title, description, context, kind })),
        meta: { total, query: q },
      }
    } catch (error: any) {
      ctx.internalServerError(`Erreur lors de la recherche: ${error.message}`)
    }
  },

  async invalidateCache(ctx: any) {
    if (!ctx.state.user) {
      return ctx.unauthorized('Authentification requise')
    }

    if (ctx.state.user.municipality_role !== 'super_admin') {
      return ctx.forbidden('Réservé au super administrateur')
    }

    try {
      const audience = ctx.request.body?.audience as DilaAudience | undefined
      if (audience) {
        if (!VALID_AUDIENCES.includes(audience)) {
          return ctx.badRequest(`Audience invalide: "${audience}"`)
        }
        await comarquageService.refreshCache(audience)
      } else {
        await Promise.all([
          comarquageService.refreshCache('particuliers'),
          comarquageService.refreshCache('professionnels'),
        ])
      }
      ctx.body = { success: true }
    } catch (error: any) {
      ctx.internalServerError(`Erreur lors de l'invalidation du cache: ${error.message}`)
    }
  },

  async cacheStatus(ctx: any) {
    if (!ctx.state.user) {
      return ctx.unauthorized('Authentification requise')
    }

    ctx.body = { data: comarquageService.getCacheStatus() }
  },
}
