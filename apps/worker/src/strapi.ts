/**
 * Routes internes de Strapi : le worker y annonce le début et la fin de chaque build.
 */
import {
  workerRoutes,
  type BuildStep,
  type FinishBuildRequest,
  type StartBuildRequest,
  type StartBuildResponse,
} from '@communeo/pipeline';

export interface StrapiReporter {
  start(jobId: string, request: StartBuildRequest): Promise<StartBuildResponse>;
  /** Étape en cours (affichée dans l'admin) ; un échec ici n'arrête pas le build */
  progress(jobId: string, step: BuildStep): Promise<void>;
  finish(jobId: string, request: FinishBuildRequest): Promise<void>;
}

export function createStrapiReporter(baseUrl: string, secret: string, fetchImpl: typeof fetch = fetch): StrapiReporter {
  const post = async (route: string, body: unknown) => {
    const response = await fetchImpl(`${baseUrl}${route}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Strapi ${route} : ${response.status} ${await response.text()}`);
    return response.json();
  };
  return {
    start: (jobId, request) => post(workerRoutes.start(jobId), request) as Promise<StartBuildResponse>,
    progress: async (jobId, step) => {
      await post(workerRoutes.progress(jobId), { step });
    },
    finish: async (jobId, request) => {
      await post(workerRoutes.finish(jobId), request);
    },
  };
}
