// Types the user that authenticateToken (JWT) and Passport (Google OAuth session)
// attach to req.user. Passport declares Express.User as an empty interface; filling it in
// lets handlers that read req.user be passed to Express routers without `as any` casts.
// Import this module (for its side effect on the global types) wherever req.user is used.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string;
      picture?: string;
    }
  }
}

export {};
