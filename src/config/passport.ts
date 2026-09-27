import passport from 'passport';
import { Profile, Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User, UserModel } from '../models/User';
import '../types/express';

const findOrCreateGoogleUser = async (profile: Profile): Promise<User> => {
  const { id, emails, displayName, photos } = profile;

  if (!emails || emails.length === 0) {
    throw new Error('No email found in Google profile');
  }

  return UserModel.findOrCreate({
    google_id: id,
    email: emails[0].value,
    name: displayName || 'Unknown User',
    picture: photos && photos.length > 0 ? photos[0].value : undefined,
    auth_type: 'google' as const,
  });
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
    },
    (_accessToken, _refreshToken, profile, done) => {
      findOrCreateGoogleUser(profile).then(
        user => done(null, user),
        (error: unknown) => {
          console.error('Error in Google OAuth strategy:', error);
          done(error, undefined);
        }
      );
    }
  )
);

export default passport;
