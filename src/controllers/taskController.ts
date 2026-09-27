import { Response } from 'express';
import { TaskModel } from '../models/Task';
import { SubagentModel } from '../models/Subagent';
import { CreateTaskInput, UpdateTaskInput, TaskFilters } from '../types/Task';
import { AuthenticatedRequest } from '../middleware/auth';
import pool from '../config/database';

const subagentModel = new SubagentModel(pool);

export const taskController = {
  // Get all tasks with optional filters
  async getAllTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const filters: TaskFilters = {
        completed:
          req.query.completed === 'true'
            ? true
            : req.query.completed === 'false'
              ? false
              : undefined,
        priority: req.query.priority as 'low' | 'medium' | 'high' | undefined,
        category: req.query.category as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };

      const tasks = await TaskModel.findAll(filters, req.user!.id);
      res.json({
        success: true,
        data: tasks,
        count: tasks.length,
      });
    } catch (error) {
      console.error('Error getting tasks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve tasks',
      });
    }
  },

  // Get today's tasks
  async getTodaysTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tasks = await TaskModel.getTodaysTasks(req.user!.id);
      res.json({
        success: true,
        data: tasks,
        count: tasks.length,
      });
    } catch (error) {
      console.error("Error getting today's tasks:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve today's tasks",
      });
    }
  },

  // Get old tasks
  async getOldTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tasks = await TaskModel.getOldTasks(req.user!.id);
      res.json({
        success: true,
        data: tasks,
        count: tasks.length,
      });
    } catch (error) {
      console.error('Error getting old tasks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve old tasks',
      });
    }
  },

  // Get task by ID
  async getTaskById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const task = await TaskModel.findById(id, req.user!.id);

      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Task not found',
        });
        return;
      }

      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      console.error('Error getting task by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve task',
      });
    }
  },

  // Create new task
  async createTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('createTask called with user:', req.user);
      const taskData: CreateTaskInput = req.body;

      if (!taskData.title || taskData.title.trim() === '') {
        res.status(400).json({
          success: false,
          message: 'Task title is required',
        });
        return;
      }

      console.log('Creating task for user:', req.user!.id);
      const task = await TaskModel.create(taskData, req.user!.id);

      // Try to auto-assign the task
      try {
        const match = await subagentModel.evaluateTaskForRules(task);
        if (match) {
          await subagentModel.assignTaskToSubagent(
            task.id,
            match.subagent.id,
            `Auto-assigned based on rule: ${match.rule.name}`,
            { rule_id: match.rule.id, auto_assigned: true }
          );
          console.log(`Task ${task.id} auto-assigned to subagent ${match.subagent.name}`);
        }
      } catch (assignmentError) {
        console.warn('Auto-assignment failed for task:', task.id, assignmentError);
        // Don't fail the task creation if auto-assignment fails
      }

      res.status(201).json({
        success: true,
        data: task,
        message: 'Task created successfully',
      });
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create task',
      });
    }
  },

  // Update task
  async updateTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateTaskInput = req.body;

      const task = await TaskModel.update(id, req.user!.id, updateData);

      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Task not found',
        });
        return;
      }

      res.json({
        success: true,
        data: task,
        message: 'Task updated successfully',
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'No fields to update') {
        res.status(400).json({
          success: false,
          message: 'No updatable fields provided',
        });
        return;
      }
      console.error('Error updating task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update task',
      });
    }
  },

  // Delete task
  async deleteTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await TaskModel.delete(id, req.user!.id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Task not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Task deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete task',
      });
    }
  },

  // Bulk operations for old tasks
  async markAllOldTasksComplete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const count = await TaskModel.markAllOldTasksComplete(req.user!.id);
      res.json({
        success: true,
        message: `${count} old tasks marked as complete`,
        count,
      });
    } catch (error) {
      console.error('Error marking old tasks complete:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark old tasks as complete',
      });
    }
  },

  async deleteAllOldTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const count = await TaskModel.deleteAllOldTasks(req.user!.id);
      res.json({
        success: true,
        message: `${count} old tasks deleted`,
        count,
      });
    } catch (error) {
      console.error('Error deleting old tasks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete old tasks',
      });
    }
  },

  async deleteCompletedOldTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const count = await TaskModel.deleteCompletedOldTasks(req.user!.id);
      res.json({
        success: true,
        message: `${count} completed old tasks deleted`,
        count,
      });
    } catch (error) {
      console.error('Error deleting completed old tasks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete completed old tasks',
      });
    }
  },

  // Toggle task completion
  async toggleTaskComplete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const task = await TaskModel.findById(id, req.user!.id);

      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Task not found',
        });
        return;
      }

      const updatedTask = await TaskModel.update(id, req.user!.id, { completed: !task.completed });
      res.json({
        success: true,
        data: updatedTask,
        message: `Task marked as ${updatedTask?.completed ? 'complete' : 'incomplete'}`,
      });
    } catch (error) {
      console.error('Error toggling task completion:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle task completion',
      });
    }
  },

  // Get deleted tasks (within TTL period)
  async getDeletedTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tasks = await TaskModel.getDeletedTasks(req.user!.id);
      res.json({
        success: true,
        data: tasks,
        count: tasks.length,
      });
    } catch (error) {
      console.error('Error getting deleted tasks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve deleted tasks',
      });
    }
  },

  // Restore a soft-deleted task
  async restoreTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const task = await TaskModel.restore(id, req.user!.id);

      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Task not found or not deleted',
        });
        return;
      }

      res.json({
        success: true,
        data: task,
        message: 'Task restored successfully',
      });
    } catch (error) {
      console.error('Error restoring task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to restore task',
      });
    }
  },

  // Hard delete a task (bypass TTL)
  async hardDeleteTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await TaskModel.hardDelete(id, req.user!.id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Task not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Task permanently deleted',
      });
    } catch (error) {
      console.error('Error permanently deleting task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to permanently delete task',
      });
    }
  },

  // Get task history
  async getTaskHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      // Only the owner may read a task's history (soft-deleted tasks included)
      const task = await TaskModel.findById(id, req.user!.id, true);
      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Task not found',
        });
        return;
      }

      const history = await TaskModel.getTaskHistory(id, req.user!.id, limit);
      res.json({
        success: true,
        data: history,
        count: history.length,
      });
    } catch (error) {
      console.error('Error getting task history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve task history',
      });
    }
  },

  // Get all task history (not specific to one task)
  async getAllTaskHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      const history = await TaskModel.getAllTaskHistory(req.user!.id, limit);
      res.json({
        success: true,
        data: history,
        count: history.length,
      });
    } catch (error) {
      console.error('Error getting all task history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve task history',
      });
    }
  },

  // Manual cleanup of expired deleted tasks
  async cleanupExpiredTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const deletedCount = await TaskModel.cleanupExpiredTasks(req.user!.id);
      res.json({
        success: true,
        message: `Cleaned up ${deletedCount} expired deleted tasks`,
        deletedCount,
      });
    } catch (error) {
      console.error('Error cleaning up expired tasks:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup expired tasks',
      });
    }
  },

  // Get tasks about to expire (for notifications)
  async getTasksAboutToExpire(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const tasks = await TaskModel.getTasksAboutToExpire(req.user!.id);
      res.json({
        success: true,
        data: tasks,
        count: tasks.length,
      });
    } catch (error) {
      console.error('Error getting tasks about to expire:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve tasks about to expire',
      });
    }
  },
};
