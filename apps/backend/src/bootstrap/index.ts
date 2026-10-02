import { requeueInterruptedExports } from '../services/data-export';
import { syncHosting } from '../services/hosting';
import { ensureBuildToken } from './build-token';
import { applyPermissions, disablePublicRegistration } from './permissions';
import { seedDevelopment, seedProduction } from './seed';

export default async ({ strapi }: { strapi: any }) => {
  await disablePublicRegistration(strapi);
  await applyPermissions(strapi);

  if (process.env.NODE_ENV === 'production') {
    await seedProduction(strapi);
  } else {
    await seedDevelopment(strapi);
  }

  await ensureBuildToken(strapi);
  await syncHosting(strapi);
  // Export des données (#343) interrompu par un redémarrage : repris par la tâche de chaque minute
  await requeueInterruptedExports();
};
