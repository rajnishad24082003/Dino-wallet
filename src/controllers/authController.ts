import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.render('login', { error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    res.cookie('jwt', token, { httpOnly: true, maxAge: 3600000 });

    if (user.role === 'ADMIN') return res.redirect('/admin');
    return res.redirect('/dashboard');

  } catch (err) {
    console.error(err);
    res.render('login', { error: 'System Error' });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie('jwt');
  res.redirect('/login');
};