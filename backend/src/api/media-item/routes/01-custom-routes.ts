export default {
  routes: [
    {
      method: 'POST',
      path: '/media-items/upload',
      handler: 'media-item.upload',
      config: {
        policies: [],
      },
    },
  ],
};
