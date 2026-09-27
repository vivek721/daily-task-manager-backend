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

const router = express.Router();

// Google OAuth routes
// @types/passport types authenticate() as returning any
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }) as RequestHandler
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed`,
  }) as RequestHandler,
  googleCallback
);

// Local authentication routes
router.post('/signup', signup);
router.post('/signin', signin);

// Development routes (only in development mode)
router.post('/dev-login', devLogin);

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.post('/logout', logout);
router.post('/verify', verifyToken);

export default router;
