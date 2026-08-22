import { Router } from 'express';
import { authenticate } from '@/shared/middlewares/authenticate';
import { walletController } from './wallet.controller';

const router = Router();

router.get('/me', authenticate, walletController.getMyWallet);

export default router;