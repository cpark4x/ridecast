import { Router } from 'express';
import * as controller from './controller';
import { authenticateToken } from '../../shared/middleware/auth';
import { validateRequest, validateParams } from '../../shared/middleware/validation';
import { convertAudioSchema, jobIdParamSchema } from './schemas';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Audio conversion routes
router.post('/convert', validateRequest(convertAudioSchema), controller.convertToAudio);
router.get('/status/:jobId', validateParams(jobIdParamSchema), controller.getJobStatus);
router.get('/jobs', controller.listJobs);
router.get('/voices', controller.getVoices);

export default router;
