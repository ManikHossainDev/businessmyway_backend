import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { adminSettingsController } from './settings.controller';
import { updateSettingBodySchema } from '@/modules/settings/settings.validation';

const router = Router();

router.get('/', adminSettingsController.list);
router.get('/contacts', adminSettingsController.listContacts);
router.get('/:slug', adminSettingsController.getBySlug);
router.put('/:slug', validate({ body: updateSettingBodySchema }), adminSettingsController.update);

export default router;
