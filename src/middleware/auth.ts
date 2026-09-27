import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import '../types/express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId?: unknown };
    const userId = decoded.userId;

    // users.id is a UUID; anything else (e.g. tokens from the old dev-login, which used
    // 'dev-user-123') would make the lookup query fail with a 500.
    if (typeof userId !== 'string' || !UUID_REGEX.test(userId)) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Verify user still exists
    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId?: unknown };
      const user =
        typeof decoded.userId === 'string' && UUID_REGEX.test(decoded.userId)
          ? await UserModel.findById(decoded.userId)
          : null;

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on invalid tokens
    next();
  }
};
