import { Request, Response, NextFunction } from 'express';
import { supabase } from '../utils/supabase';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Development fallback if no token is provided
    req.user = { id: '57bc2705-e440-4a59-93aa-29fb952eb96f' };
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify token using Supabase client
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      // Development fallback if token is invalid/expired
      req.user = { id: '57bc2705-e440-4a59-93aa-29fb952eb96f' };
      return next();
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
};
