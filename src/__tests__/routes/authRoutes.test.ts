import express from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import request from 'supertest';
import authRoutes from '../../routes/authRoutes';

jest.mock('../../models/User');
jest.mock('../../config/database');

const GOOGLE_USER = {
  id: '66666666-6666-4666-8666-666666666666',
  email: 'google-user@example.com',
  name: 'Google User',
};

// Stands in for the Google strategy: completes the OAuth callback with a known user
// instead of calling Google.
const fakeGoogleStrategy: passport.Strategy = {
  authenticate(this: passport.StrategyCreated<passport.Strategy>) {
    this.success(GOOGLE_USER);
  },
};

describe('Google OAuth callback without sessions', () => {
  // Same setup as src/index.ts: passport.initialize() and no express-session
  const app = express();
  app.use(passport.initialize());
  app.use('/api/auth', authRoutes);

  beforeAll(() => {
    passport.use('google', fakeGoogleStrategy);
  });

  it('redirects to the frontend with a JWT and sets no cookie', async () => {
    const response = await request(app).get('/api/auth/google/callback?code=abc').expect(302);

    const location = new URL(response.headers.location);
    expect(`${location.origin}${location.pathname}`).toBe(
      `${process.env.FRONTEND_URL}/auth/callback`
    );
    const token = location.searchParams.get('token');
    const decoded = jwt.verify(token!, process.env.JWT_SECRET!) as { userId: string };
    expect(decoded.userId).toBe(GOOGLE_USER.id);
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('logout succeeds without a session', async () => {
    const response = await request(app).post('/api/auth/logout').expect(200);
    expect(response.body).toEqual({ success: true, message: 'Logged out successfully' });
  });
});
