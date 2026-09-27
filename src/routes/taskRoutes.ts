import { Router } from 'express';
import { taskController } from '../controllers/taskController';
import { validateCreateTask, validateUpdateTask, validateTaskId } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply required authentication to all routes
router.use(authenticateToken as any);

// Specific routes (must come before dynamic :id routes)
router.get('/today', taskController.getTodaysTasks as any);
router.get('/old', taskController.getOldTasks as any);
router.get('/deleted', taskController.getDeletedTasks as any);
router.get('/history/all', taskController.getAllTaskHistory as any);
router.get('/expiring', taskController.getTasksAboutToExpire as any);

// Bulk operations for old tasks
router.patch('/old/complete-all', taskController.markAllOldTasksComplete as any);
router.delete('/old/all', taskController.deleteAllOldTasks as any);
router.delete('/old/completed', taskController.deleteCompletedOldTasks as any);

// Administrative endpoints
router.post('/cleanup', taskController.cleanupExpiredTasks as any);

// Basic CRUD operations with dynamic :id (must come after specific routes)
router.get('/', taskController.getAllTasks as any);
router.get('/:id', validateTaskId, taskController.getTaskById as any);
router.post('/', validateCreateTask, taskController.createTask as any);
router.put('/:id', validateTaskId, validateUpdateTask, taskController.updateTask as any);
router.delete('/:id', validateTaskId, taskController.deleteTask as any);

// Task-specific operations with :id
router.patch('/:id/toggle', validateTaskId, taskController.toggleTaskComplete as any);
router.patch('/:id/restore', validateTaskId, taskController.restoreTask as any);
router.delete('/:id/permanent', validateTaskId, taskController.hardDeleteTask as any);
router.get('/:id/history', validateTaskId, taskController.getTaskHistory as any);

export default router;
