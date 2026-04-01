export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) ?? [
      'http://localhost:3000',
      'http://localhost:3001',
    ],
  },
});
