import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import { pool } from '../config/db';

const router = Router();

router.get('/login', (req, res) => res.render('login', { error: null }));

// User Dashboard
router.get('/dashboard', requireAuth, async (req, res) => {
  if (req.user?.role === 'ADMIN') return res.redirect('/admin');
  
  const walletsRes = await pool.query(
    'SELECT * FROM wallets WHERE user_id = $1 ORDER BY asset_code DESC', 
    [req.user!.id]
  );

  const txRes = await pool.query(
    `SELECT t.type, t.description, l.amount, t.created_at, w.asset_code
     FROM transactions t 
     JOIN ledger_entries l ON t.id = l.transaction_id 
     JOIN wallets w ON l.wallet_id = w.id
     WHERE w.user_id = $1 
     ORDER BY t.created_at DESC LIMIT 10`,
    [req.user!.id]
  );

  res.render('dashboard', { 
    user: req.user, 
    wallets: walletsRes.rows,
    transactions: txRes.rows 
  });
});

// Admin Dashboard
router.get('/admin', requireAuth, requireAdmin, async (req, res) => {
  const users = await pool.query('SELECT username, email, role FROM users LIMIT 10');
  
  const txs = await pool.query(`
    SELECT t.id, t.type, t.description, t.created_at, l.amount, w.asset_code
    FROM transactions t
    JOIN ledger_entries l ON t.id = l.transaction_id
    JOIN wallets w ON l.wallet_id = w.id
    WHERE l.amount > 0  -- specific filter to get the positive value of the transfer
    ORDER BY t.created_at DESC 
    LIMIT 10
  `);
  
  res.render('admin', { users: users.rows, transactions: txs.rows });
});

// Redirect root URL to login
router.get('/', (req, res) => res.redirect('/login'));

export default router;