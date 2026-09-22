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
};
