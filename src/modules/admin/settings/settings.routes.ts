import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { adminSettingsController } from './settings.controller';
import { settingSlugParamSchema, updateSettingBodySchema } from '@/modules/settings/settings.validation';

const router = Router();

router.get('/', adminSettingsController.list);
router.get('/contacts', adminSettingsController.listContacts);
router.get('/:slug', validate({ params: settingSlugParamSchema }), adminSettingsController.getBySlug);
router.put(
    '/:slug',
    validate({ params: settingSlugParamSchema, body: updateSettingBodySchema }),
    adminSettingsController.update,
);

export default router;
