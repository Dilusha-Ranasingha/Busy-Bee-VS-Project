import { Router } from 'express';
import { taskRunsController } from './taskRuns.controller';

const router = Router();

router.post('/', taskRunsController.createRun);
router.get('/stats', taskRunsController.getStats);

export default router;
