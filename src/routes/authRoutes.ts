import express, { Request, Response } from 'express';
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
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed`,
  }),
  googleCallback as any
);

// Local authentication routes
router.post('/signup', signup);
router.post('/signin', signin);

// Development routes (only in development mode)
router.post('/dev-login', devLogin);

// Protected routes
router.get('/profile', authenticateToken as any, getProfile as any);
router.post('/logout', logout);
router.post('/verify', verifyToken);

export default router;
