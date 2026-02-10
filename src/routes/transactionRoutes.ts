import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { handleTransaction } from '../controllers/transactionController';

const router = Router();

router.post('/transaction', requireAuth, handleTransaction);

export default router;