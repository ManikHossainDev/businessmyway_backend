import { Router } from 'express';
import { adminDashboardController } from './dashboard.controller';

const router = Router();

router.get('/', adminDashboardController.getStats);

export default router;
