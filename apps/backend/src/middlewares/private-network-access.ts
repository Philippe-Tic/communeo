export default (config, { strapi }) => {
  return async (ctx, next) => {
    if (ctx.get('Access-Control-Request-Private-Network') === 'true') {
      ctx.set('Access-Control-Allow-Private-Network', 'true');
    }
    await next();
  };
};
