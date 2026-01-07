import { Router } from 'express';
import * as productivityScoreController from './productivityScore.controller';

const router = Router();

router.get('/', productivityScoreController.getScore);
router.get('/range', productivityScoreController.getScoreRange);

export default router;
