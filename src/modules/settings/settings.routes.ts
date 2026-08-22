import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { settingsController } from './settings.controller';
import { contactFormBodySchema } from './settings.validation';

const router = Router();

router.get('/public/:slug', settingsController.getPublic);
router.post('/contact', validate({ body: contactFormBodySchema }), settingsController.contact);

export default router;
