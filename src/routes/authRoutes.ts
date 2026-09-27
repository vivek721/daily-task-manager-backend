import express, { RequestHandler } from 'express';
import passport from '../config/passport';
import {
  googleCallback,
  getProfile,
  logout,
  verifyToken,
  devLogin,
  signup,
  signin,
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { apiLimiter, authLimiter } from '../middleware/rateLimit';

const router = express.Router();

// General rate limit for every auth route; credential endpoints add authLimiter below
router.use(apiLimiter);

// Google OAuth routes. Stateless: no login session is created; the callback handler
// signs a JWT and redirects to the frontend with it.
// @types/passport types authenticate() as returning any
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  }) as RequestHandler
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed`,
    session: false,
  }) as RequestHandler,
  googleCallback
);

// Local authentication routes
router.post('/signup', authLimiter, signup);
router.post('/signin', authLimiter, signin);

// Development routes (only in development mode)
router.post('/dev-login', authLimiter, devLogin);

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.post('/logout', logout);
router.post('/verify', authLimiter, verifyToken);

export default router;
