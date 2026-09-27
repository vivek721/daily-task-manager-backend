import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, CreateLocalUserInput, LoginCredentials } from '../types/User';
import { UserModel } from '../models/User';

interface AuthenticatedRequest extends Request {
  user?: User;
}

export const googleCallback = (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=authentication_failed`);
      return;
    }

    // Generate JWT token
    const payload = {
      userId: req.user.id,
      email: req.user.email,
      name: req.user.name,
    };
    const secret = process.env.JWT_SECRET!;
    const options = {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    } as SignOptions;

    const token = jwt.sign(payload, secret, options);

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (error) {
    console.error('Error in Google callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
  }
};

export const getProfile = (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Return user profile without sensitive information
    const { id, email, name, picture } = req.user;
    res.json({
      success: true,
      user: { id, email, name, picture },
    });
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = (req: Request, res: Response): void => {
  req.logout(err => {
    if (err) {
      console.error('Error during logout:', err);
      res.status(500).json({ error: 'Logout failed' });
      return;
    }

    res.json({ success: true, message: 'Logged out successfully' });
  });
};

export const verifyToken = (req: Request, res: Response): void => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    res.json({
      success: true,
      user: {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.name,
      },
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Local authentication signup
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, name, password }: CreateLocalUserInput = req.body;

    // Validation
    if (!username || !email || !name || !password) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    if (username.length < 3) {
      res.status(400).json({ error: 'Username must be at least 3 characters long' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long' });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    // Check if username already exists
    const usernameExists = await UserModel.checkUsernameExists(username);
    if (usernameExists) {
      res.status(409).json({ error: 'Username already exists' });
      return;
    }

    // Check if email already exists
    const emailExists = await UserModel.checkEmailExists(email);
    if (emailExists) {
      res.status(409).json({ error: 'Email already exists' });
      return;
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user
    const userData = {
      username,
      email,
      name,
      password_hash,
      auth_type: 'local' as const,
    };

    const user = await UserModel.create(userData);

    // Generate JWT token
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
    };
    const secret = process.env.JWT_SECRET!;
    const options = {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    } as SignOptions;

    const token = jwt.sign(payload, secret, options);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
      },
      message: 'Account created successfully',
    });
  } catch (error) {
    console.error('Error in signup:', error);
    res.status(500).json({ error: 'Account creation failed' });
  }
};

// Local authentication signin
export const signin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password }: LoginCredentials = req.body;

    // Validation
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    // Find user by username
    const user = await UserModel.findByUsername(username);
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Verify password
    if (!user.password_hash) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Update last login
    await UserModel.updateLastLogin(user.id);

    // Generate JWT token
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
    };
    const secret = process.env.JWT_SECRET!;
    const options = {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    } as SignOptions;

    const token = jwt.sign(payload, secret, options);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
      },
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Error in signin:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Fixed identity of the development user. It is a local account with no password, so it
// cannot be used through /signin.
export const DEV_USER = {
  username: 'dev-user',
  email: 'dev-user@example.com',
  name: 'Dev User',
} as const;

// Development login bypass. Only enabled when NODE_ENV is explicitly 'development', so a
// deployment that forgets to set NODE_ENV does not expose it.
export const devLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    // Find or create a real users row so the token's userId is a valid UUID that
    // authenticateToken can load.
    const user = await UserModel.findOrCreate({
      username: DEV_USER.username,
      email: DEV_USER.email,
      name: DEV_USER.name,
      auth_type: 'local',
    });

    const testUser = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    // Generate JWT token for test user
    const payload = {
      userId: testUser.id,
      email: testUser.email,
      name: testUser.name,
    };
    const secret = process.env.JWT_SECRET!;
    const options = {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    } as SignOptions;

    const token = jwt.sign(payload, secret, options);

    res.json({
      success: true,
      token,
      user: testUser,
      message: 'Development login successful',
    });
  } catch (error) {
    console.error('Error in dev login:', error);
    res.status(500).json({ error: 'Development login failed' });
  }
};
