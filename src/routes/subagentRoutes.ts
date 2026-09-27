import { Router } from 'express';
import { subagentController } from '../controllers/subagentController';
import { authenticateToken } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimit';

const router = Router();

// Rate limit, then require authentication, on all routes
router.use(apiLimiter);
router.use(authenticateToken);

// Subagent CRUD operations
router.get('/', subagentController.getAllSubagents);
router.get('/stats', subagentController.getSubagentStats);
router.get('/:id', subagentController.getSubagentById);
router.post('/', subagentController.createSubagent);
router.put('/:id', subagentController.updateSubagent);
router.delete('/:id', subagentController.deleteSubagent);

// Subagent assignments
router.get('/:subagentId/assignments', subagentController.getSubagentAssignments);

// Assignment operations
router.post('/assign/:taskId/:subagentId', subagentController.assignTaskToSubagent);
router.get('/assignments/task/:taskId', subagentController.getTaskAssignments);
router.get('/assignments/history', subagentController.getAssignmentHistory);
router.patch('/assignments/:assignmentId/status', subagentController.updateAssignmentStatus);

// Auto-assignment
router.post('/auto-assign/:taskId', subagentController.autoAssignTask);

// Assignment rules
router.get('/rules/all', subagentController.getAllAssignmentRules);
router.post('/rules', subagentController.createAssignmentRule);

export default router;
