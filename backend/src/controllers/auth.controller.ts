import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// SIGNUP Logic
export const signup = async (req: Request, res: Response) => {
  const { email, password, fullName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Create user in Supabase Auth
    // NOTE: If Email Confirmations are enabled in Supabase settings, 
    // this will automatically send a verification email.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || '',
        }
      }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    return res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.',
      user: authData.user,
    });

  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// LOGIN Logic
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({ error: authError.message });
    }

    const profile = await prisma.profile.findUnique({
      where: { id: authData.user.id }
    });

    return res.status(200).json({
      message: 'Login successful',
      session: authData.session,
      profile
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// FORGOT PASSWORD (Request Reset Email)
export const resetPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:3000/update-password', // Change this to your frontend URL
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Password reset instructions sent to your email.' });
  } catch (error) {
    console.error('Reset Password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET CURRENT USER Logic (Protected Route)
export const me = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not found in request' });
    }

    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      include: {
        socialAccounts: true,
        adAccounts: true
      }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    return res.status(200).json({ profile });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
