export default () => ({
  mcp: {
    enabled: true,
    config: {
      session: {
        type: 'memory',
        max: 20,
        ttlMs: 600000, // 10 minutes
      },
    },
  },
});
