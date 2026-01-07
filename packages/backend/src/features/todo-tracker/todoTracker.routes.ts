import { Router } from 'express';
import { TodoTrackerController } from './todoTracker.controller.js';
import { TodoTrackerService } from './todoTracker.service.js';
import { NlpService } from './nlp.service.js';
import { AssociationService } from './association.service.js';
import { ScoringService } from './scoring.service.js';
import { SummarizerService } from './summarizer.service.js';
import { ModelRegistry } from '../../ml/modelRegistry.js';

const router = Router();

// --- build dependencies (simple DI) ---
const models = new ModelRegistry();
const nlp = new NlpService(models);
const assoc = new AssociationService(models);
const scoring = new ScoringService();
const summarizer = new SummarizerService();

const service = new TodoTrackerService(nlp, assoc, scoring, summarizer);
const controller = new TodoTrackerController(service);

// --- routes ---
router.get('/health', controller.health);

// recommended combined endpoint
router.post('/enrich', controller.enrich);

// DB persistence (explicit sync from extension)
router.post('/sync', controller.syncProject);

// Project selection + pull todos
router.get('/projects', controller.listProjects);
router.get('/projects/:projectId/todos', controller.getProjectTodos);

// optional separated endpoints
router.post('/analyze', controller.analyze);
router.post('/associate', controller.associate);
router.post('/summarize', controller.summarize);

export default router;
