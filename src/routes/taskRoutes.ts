import { Router } from 'express';
import { taskController } from '../controllers/taskController';
import { validateCreateTask, validateUpdateTask, validateTaskId } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply required authentication to all routes
router.use(authenticateToken);

// Specific routes (must come before dynamic :id routes)
router.get('/today', taskController.getTodaysTasks);
router.get('/old', taskController.getOldTasks);
router.get('/deleted', taskController.getDeletedTasks);
router.get('/history/all', taskController.getAllTaskHistory);
router.get('/expiring', taskController.getTasksAboutToExpire);

// Bulk operations for old tasks
router.patch('/old/complete-all', taskController.markAllOldTasksComplete);
router.delete('/old/all', taskController.deleteAllOldTasks);
router.delete('/old/completed', taskController.deleteCompletedOldTasks);

// Administrative endpoints
router.post('/cleanup', taskController.cleanupExpiredTasks);

// Basic CRUD operations with dynamic :id (must come after specific routes)
router.get('/', taskController.getAllTasks);
router.get('/:id', validateTaskId, taskController.getTaskById);
router.post('/', validateCreateTask, taskController.createTask);
router.put('/:id', validateTaskId, validateUpdateTask, taskController.updateTask);
router.delete('/:id', validateTaskId, taskController.deleteTask);

// Task-specific operations with :id
router.patch('/:id/toggle', validateTaskId, taskController.toggleTaskComplete);
router.patch('/:id/restore', validateTaskId, taskController.restoreTask);
router.delete('/:id/permanent', validateTaskId, taskController.hardDeleteTask);
router.get('/:id/history', validateTaskId, taskController.getTaskHistory);

export default router;
