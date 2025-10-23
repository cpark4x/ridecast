import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthTokenPayload, AuthRequest } from '../types';
import { errorResponse } from '../utils/response';
import logger from '../utils/logger';

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      errorResponse(res, 'Authentication token required', 401);
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET not configured');
      errorResponse(res, 'Server configuration error', 500);
      return;
    }

    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        logger.warn('Invalid token attempt', { error: err.message });
        errorResponse(res, 'Invalid or expired token', 403);
        return;
      }

      (req as AuthRequest).user = decoded as AuthTokenPayload;
      next();
    });
  } catch (error) {
    logger.error('Auth middleware error', { error });
    errorResponse(res, 'Authentication failed', 500);
  }
}

export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      next();
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      next();
      return;
    }

    jwt.verify(token, secret, (err, decoded) => {
      if (!err && decoded) {
        (req as AuthRequest).user = decoded as AuthTokenPayload;
      }
      next();
    });
  } catch (error) {
    next();
  }
}
