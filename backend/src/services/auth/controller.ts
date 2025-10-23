import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../../config/database';
import { AuthTokenPayload, AuthTokens, AuthRequest } from '../../shared/types';
import { successResponse, errorResponse } from '../../shared/utils/response';
import { ValidationError, UnauthorizedError } from '../../shared/middleware/errorHandler';
import logger from '../../shared/utils/logger';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

function generateTokens(payload: AuthTokenPayload): AuthTokens {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
  const jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  if (!jwtSecret || !jwtRefreshSecret) {
    throw new Error('JWT secrets not configured');
  }

  const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });
  const refreshToken = jwt.sign(payload, jwtRefreshSecret, {
    expiresIn: jwtRefreshExpiresIn
  });

  return { accessToken, refreshToken };
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);

    if (existingUser.rows.length > 0) {
      errorResponse(res, 'User with this email already exists', 409);
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user
    const result = await query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
      [email, passwordHash, name || null]
    );

    const user = result.rows[0];

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email
    });

    logger.info('User registered', { userId: user.id, email: user.email });

    successResponse(
      res,
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          created_at: user.created_at
        },
        ...tokens
      },
      'User registered successfully',
      201
    );
  } catch (error) {
    logger.error('Registration error', { error });
    errorResponse(res, 'Registration failed', 500);
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await query(
      'SELECT id, email, password_hash, name FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      errorResponse(res, 'Invalid email or password', 401);
      return;
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      errorResponse(res, 'Invalid email or password', 401);
      return;
    }

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email
    });

    logger.info('User logged in', { userId: user.id, email: user.email });

    successResponse(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      ...tokens
    });
  } catch (error) {
    logger.error('Login error', { error });
    errorResponse(res, 'Login failed', 500);
  }
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!jwtRefreshSecret) {
      errorResponse(res, 'Server configuration error', 500);
      return;
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, jwtRefreshSecret) as AuthTokenPayload;

    // Generate new tokens
    const tokens = generateTokens({
      userId: decoded.userId,
      email: decoded.email
    });

    logger.info('Token refreshed', { userId: decoded.userId });

    successResponse(res, tokens);
  } catch (error) {
    logger.warn('Invalid refresh token attempt', { error });
    errorResponse(res, 'Invalid or expired refresh token', 403);
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    if (authReq.user) {
      logger.info('User logged out', { userId: authReq.user.userId });
    }

    successResponse(res, null, 'Logged out successfully');
  } catch (error) {
    logger.error('Logout error', { error });
    errorResponse(res, 'Logout failed', 500);
  }
}

export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      errorResponse(res, 'User not authenticated', 401);
      return;
    }

    const result = await query(
      'SELECT id, email, name, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    successResponse(res, result.rows[0]);
  } catch (error) {
    logger.error('Get current user error', { error });
    errorResponse(res, 'Failed to fetch user', 500);
  }
}
