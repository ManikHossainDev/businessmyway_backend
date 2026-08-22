import { Router } from 'express';
import { devController } from './dev.controller';

const router = Router();

router.get('/otp', devController.getOtp);
router.get('/mailbox', devController.getMailbox);

export default router;
