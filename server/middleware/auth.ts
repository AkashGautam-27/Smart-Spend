import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { User } from '../models/User';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token is required.' });
    return;
  }

  try {
    const decoded = verifyAccessToken(token);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (error: any) {
    console.warn('[Auth Middleware] Invalid token verification attempt:', error?.message || error);
    res.status(403).json({ error: 'Session expired or invalid token.' });
  }
}

// Authorization middleware to check if user has verified email
export async function authorizeVerified(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: 'User account not found.' });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({ error: 'Account email is not verified. Please verify your OTP.' });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}

// Middleware to require administrative privileges
export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: 'User account not found.' });
      return;
    }

    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}
