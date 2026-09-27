import { Router } from 'express';
import { subagentController } from '../controllers/subagentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply required authentication to all routes
router.use(authenticateToken as any);

// Subagent CRUD operations
router.get('/', subagentController.getAllSubagents as any);
router.get('/stats', subagentController.getSubagentStats as any);
router.get('/:id', subagentController.getSubagentById as any);
router.post('/', subagentController.createSubagent as any);
router.put('/:id', subagentController.updateSubagent as any);
router.delete('/:id', subagentController.deleteSubagent as any);

// Subagent assignments
router.get('/:subagentId/assignments', subagentController.getSubagentAssignments as any);

// Assignment operations
router.post('/assign/:taskId/:subagentId', subagentController.assignTaskToSubagent as any);
router.get('/assignments/task/:taskId', subagentController.getTaskAssignments as any);
router.get('/assignments/history', subagentController.getAssignmentHistory as any);
router.patch('/assignments/:assignmentId/status', subagentController.updateAssignmentStatus as any);

// Auto-assignment
router.post('/auto-assign/:taskId', subagentController.autoAssignTask as any);

// Assignment rules
router.get('/rules/all', subagentController.getAllAssignmentRules as any);
router.post('/rules', subagentController.createAssignmentRule as any);

export default router;
