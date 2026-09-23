export default {
  routes: [
    {
      method: 'POST',
      path: '/media-items/upload',
      handler: 'media-item.upload',
    },
    {
      method: 'GET',
      path: '/media-items/folders',
      handler: 'media-item.folders',
    },
    {
      method: 'GET',
      path: '/media-items/usage',
      handler: 'media-item.usage',
    },
  ],
};
