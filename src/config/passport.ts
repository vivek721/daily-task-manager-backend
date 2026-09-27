import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { UserModel } from '../models/User';
import { User } from '../types/User';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const { id, emails, displayName, photos } = profile;

        if (!emails || emails.length === 0) {
          return done(new Error('No email found in Google profile'), undefined);
        }

        const userData = {
          google_id: id,
          email: emails[0].value,
          name: displayName || 'Unknown User',
          picture: photos && photos.length > 0 ? photos[0].value : undefined,
          auth_type: 'google' as const,
        };

        const user = await UserModel.findOrCreate(userData);
        return done(null, user);
      } catch (error) {
        console.error('Error in Google OAuth strategy:', error);
        return done(error, undefined);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await UserModel.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
