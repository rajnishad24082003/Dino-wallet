import { Request, Response } from 'express';
import { WalletService } from '../services/walletService';
import { pool } from '../config/db';

const SYSTEM = {
  TREASURY: '00000000-0000-0000-0000-000000000001',
  REVENUE: '00000000-0000-0000-0000-000000000002'
};

export const handleTransaction = async (req: Request, res: Response) => {
  const { type, amount, assetCode, targetEmail } = req.body;
  const idempotencyKey = (req.headers['idempotency-key'] as string) || req.body.idempotencyKey;
  
  let targetUserId = req.user!.id;

  try {
    if (req.user?.role === 'ADMIN' && targetEmail) {
      const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [targetEmail]);
      if (userRes.rows.length === 0) {
        return res.status(404).json({ error: 'Target user email not found' });
      }
      targetUserId = userRes.rows[0].id;
    }

    let sourceWalletId, targetWalletId;

    if (type === 'DEPOSIT') {

      const sysRes = await pool.query('SELECT id FROM wallets WHERE user_id = $1 AND asset_code = $2', [SYSTEM.TREASURY, assetCode]);
      if (sysRes.rows.length === 0) throw new Error('System Treasury wallet missing');
      sourceWalletId = sysRes.rows[0].id;

      const userWalletRes = await pool.query('SELECT id FROM wallets WHERE user_id = $1 AND asset_code = $2', [targetUserId, assetCode]);
      if (userWalletRes.rows.length === 0) throw new Error(`User does not have a ${assetCode} wallet`);
      targetWalletId = userWalletRes.rows[0].id;

    } else if (type === 'PURCHASE') {

      const userWalletRes = await pool.query('SELECT id FROM wallets WHERE user_id = $1 AND asset_code = $2', [targetUserId, assetCode]);
      if (userWalletRes.rows.length === 0) throw new Error('User wallet not found');
      sourceWalletId = userWalletRes.rows[0].id;

      const sysRes = await pool.query('SELECT id FROM wallets WHERE user_id = $1 AND asset_code = $2', [SYSTEM.REVENUE, assetCode]);
      if (sysRes.rows.length === 0) throw new Error('System Revenue wallet missing');
      targetWalletId = sysRes.rows[0].id;

    } else {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    await WalletService.executeTransfer({
      idempotencyKey,
      amount: Number(amount),
      assetCode,
      sourceWalletId,
      targetWalletId,
      type,
      description: `${type} triggered by ${req.user!.username}`
    });

    res.json({ status: 'success' });

  } catch (error: any) {
    console.error("Transaction Error:", error);
    res.status(400).json({ error: error.message || 'Transaction failed' });
  }
};