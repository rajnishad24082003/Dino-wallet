import { pool } from '../config/db';

export interface TransferParams {
  idempotencyKey: string;
  amount: number;
  assetCode: string;
  sourceWalletId: string;
  targetWalletId: string;
  type: string;
  description: string;
}

export class WalletService {
  static async executeTransfer(params: TransferParams) {
    const client = await pool.connect();
    const lockOrder = [params.sourceWalletId, params.targetWalletId].sort();

    try {
      await client.query('BEGIN');

      const check = await client.query('SELECT id FROM transactions WHERE idempotency_key = $1', [params.idempotencyKey]);
      if (check.rows.length > 0) {
        await client.query('ROLLBACK');
        return { success: true, message: 'Duplicate' };
      }

      for (const id of lockOrder) {
        await client.query('SELECT id FROM wallets WHERE id = $1 FOR UPDATE', [id]);
      }

      const balanceRes = await client.query('SELECT balance FROM wallets WHERE id = $1', [params.sourceWalletId]);
      if (parseFloat(balanceRes.rows[0].balance) < params.amount) {
        throw new Error('Insufficient balance');
      }

      const tx = await client.query(
        'INSERT INTO transactions (idempotency_key, type, description) VALUES ($1, $2, $3) RETURNING id',
        [params.idempotencyKey, params.type, params.description]
      );
      const txId = tx.rows[0].id;

      await client.query('INSERT INTO ledger_entries (transaction_id, wallet_id, amount) VALUES ($1, $2, $3), ($1, $4, $5)', 
        [txId, params.sourceWalletId, -params.amount, params.targetWalletId, params.amount]);

      await client.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [params.amount, params.sourceWalletId]);
      await client.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [params.amount, params.targetWalletId]);

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}