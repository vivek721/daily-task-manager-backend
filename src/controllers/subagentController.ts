import { Response } from 'express';
import { SubagentModel } from '../models/Subagent';
import pool from '../config/database';
import { TaskModel } from '../models/Task';
import { AuthenticatedRequest } from '../middleware/auth';
import { 
  CreateSubagentInput, 
  UpdateSubagentInput, 
  CreateAssignmentRuleInput, 
  UpdateAssignmentRuleInput 
} from '../types/Subagent';

const subagentModel = new SubagentModel(pool);

export const subagentController = {
  // Subagent CRUD operations
  async getAllSubagents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const subagents = await subagentModel.findAllSubagents();
      res.json({
        success: true,
        data: subagents,
        count: subagents.length
      });
    } catch (error) {
      console.error('Error getting subagents:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve subagents'
      });
    }
  },

  async getSubagentById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const subagent = await subagentModel.findSubagentById(id);

      if (!subagent) {
        res.status(404).json({
          success: false,
          message: 'Subagent not found'
        });
        return;
      }

      res.json({
        success: true,
        data: subagent
      });
    } catch (error) {
      console.error('Error getting subagent by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve subagent'
      });
    }
  },

  async createSubagent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const subagentData: CreateSubagentInput = req.body;

      if (!subagentData.name || !subagentData.type) {
        res.status(400).json({
          success: false,
          message: 'Subagent name and type are required'
        });
        return;
      }

      const subagent = await subagentModel.createSubagent(subagentData);
      res.status(201).json({
        success: true,
        data: subagent,
        message: 'Subagent created successfully'
      });
    } catch (error: any) {
      console.error('Error creating subagent:', error);
      if (error.code === '23505') { // Unique constraint violation
        res.status(409).json({
          success: false,
          message: 'Subagent name already exists'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to create subagent'
        });
      }
    }
  },

  async updateSubagent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateSubagentInput = req.body;

      const subagent = await subagentModel.updateSubagent(id, updateData);

      if (!subagent) {
        res.status(404).json({
          success: false,
          message: 'Subagent not found'
        });
        return;
      }

      res.json({
        success: true,
        data: subagent,
        message: 'Subagent updated successfully'
      });
    } catch (error) {
      console.error('Error updating subagent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update subagent'
      });
    }
  },

  async deleteSubagent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await subagentModel.deleteSubagent(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Subagent not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Subagent deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting subagent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete subagent'
      });
    }
  },

  // Assignment operations
  async assignTaskToSubagent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { taskId, subagentId } = req.params;
      const { reason, metadata } = req.body;

      if (!reason) {
        res.status(400).json({
          success: false,
          message: 'Assignment reason is required'
        });
        return;
      }

      // Users may only assign their own tasks
      const task = await TaskModel.findById(taskId, req.user!.id);
      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Task not found'
        });
        return;
      }

      const assignment = await subagentModel.assignTaskToSubagent(
        taskId,
        subagentId,
        reason, 
        metadata
      );

      res.status(201).json({
        success: true,
        data: assignment,
        message: 'Task assigned successfully'
      });
    } catch (error: any) {
      console.error('Error assigning task:', error);
      if (error.code === '23505') { // Unique constraint violation
        res.status(409).json({
          success: false,
          message: 'Task is already assigned to this subagent'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to assign task'
        });
      }
    }
  },

  async getTaskAssignments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;

      // Users may only see assignments of their own tasks (soft-deleted included)
      const task = await TaskModel.findById(taskId, req.user!.id, true);
      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Task not found'
        });
        return;
      }

      const assignments = await subagentModel.getTaskAssignments(taskId);

      res.json({
        success: true,
        data: assignments,
        count: assignments.length
      });
    } catch (error) {
      console.error('Error getting task assignments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve task assignments'
      });
    }
  },

  async getSubagentAssignments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { subagentId } = req.params;
      const assignments = await subagentModel.getSubagentAssignments(subagentId, req.user!.id);

      res.json({
        success: true,
        data: assignments,
        count: assignments.length
      });
    } catch (error) {
      console.error('Error getting subagent assignments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve subagent assignments'
      });
    }
  },

  async updateAssignmentStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { assignmentId } = req.params;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          message: 'Status is required'
        });
        return;
      }

      const assignment = await subagentModel.updateAssignmentStatus(assignmentId, status, req.user!.id);

      if (!assignment) {
        res.status(404).json({
          success: false,
          message: 'Assignment not found'
        });
        return;
      }

      res.json({
        success: true,
        data: assignment,
        message: 'Assignment status updated successfully'
      });
    } catch (error) {
      console.error('Error updating assignment status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update assignment status'
      });
    }
  },

  // Auto-assignment
  async autoAssignTask(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;
      
      // Get task details (only the caller's own, non-deleted tasks)
      const task = await TaskModel.findById(taskId, req.user!.id);

      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Task not found'
        });
        return;
      }

      const match = await subagentModel.evaluateTaskForRules(task);

      if (!match) {
        res.json({
          success: false,
          message: 'No suitable subagent found for this task'
        });
        return;
      }

      const assignment = await subagentModel.assignTaskToSubagent(
        taskId,
        match.subagent.id,
        `Auto-assigned based on rule: ${match.rule.name}`,
        { rule_id: match.rule.id }
      );

      res.json({
        success: true,
        data: {
          assignment,
          subagent: match.subagent,
          rule: match.rule
        },
        message: 'Task auto-assigned successfully'
      });
    } catch (error) {
      console.error('Error auto-assigning task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to auto-assign task'
      });
    }
  },

  // Assignment Rules
  async getAllAssignmentRules(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const rules = await subagentModel.findAllAssignmentRules();
      res.json({
        success: true,
        data: rules,
        count: rules.length
      });
    } catch (error) {
      console.error('Error getting assignment rules:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve assignment rules'
      });
    }
  },

  async createAssignmentRule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const ruleData: CreateAssignmentRuleInput = req.body;

      if (!ruleData.name || !ruleData.trigger_conditions || !ruleData.assignment_criteria) {
        res.status(400).json({
          success: false,
          message: 'Rule name, trigger conditions, and assignment criteria are required'
        });
        return;
      }

      const rule = await subagentModel.createAssignmentRule(ruleData);
      res.status(201).json({
        success: true,
        data: rule,
        message: 'Assignment rule created successfully'
      });
    } catch (error) {
      console.error('Error creating assignment rule:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create assignment rule'
      });
    }
  },

  // Statistics and monitoring
  async getSubagentStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const stats = await subagentModel.getSubagentStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting subagent stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve subagent statistics'
      });
    }
  },

  async getAssignmentHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await subagentModel.getAssignmentHistory(req.user!.id, limit);
      
      res.json({
        success: true,
        data: history,
        count: history.length
      });
    } catch (error) {
      console.error('Error getting assignment history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve assignment history'
      });
    }
  }
};