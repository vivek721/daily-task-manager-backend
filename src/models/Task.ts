import pool from '../config/database';
import { Task, CreateTaskInput, UpdateTaskInput, TaskFilters } from '../types/Task';
import { QueryResult } from 'pg';

export class TaskModel {
  static async create(taskData: CreateTaskInput, userId?: string): Promise<Task> {
    const {
      title,
      description,
      priority = 'medium',
      due_date,
      category,
      tags
    } = taskData;

    const query = `
      INSERT INTO tasks (title, description, priority, due_date, category, tags, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      title,
      description || null,
      priority,
      due_date ? new Date(due_date) : null,
      category || null,
      tags || [],
      userId || null
    ];

    try {
      const result: QueryResult<Task> = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  static async findAll(filters: TaskFilters = {}, userId?: string): Promise<Task[]> {
    let query = 'SELECT * FROM tasks WHERE deleted_at IS NULL';
    const values: any[] = [];
    let paramCount = 0;

    // Filter by user if provided
    if (userId) {
      paramCount++;
      query += ` AND user_id = $${paramCount}`;
      values.push(userId);
    } else {
      // If no userId provided, only show tasks without user_id (legacy tasks)
      query += ' AND user_id IS NULL';
    }

    if (filters.completed !== undefined) {
      paramCount++;
      query += ` AND completed = $${paramCount}`;
      values.push(filters.completed);
    }

    if (filters.priority) {
      paramCount++;
      query += ` AND priority = $${paramCount}`;
      values.push(filters.priority);
    }

    if (filters.category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      values.push(filters.category);
    }

    if (filters.startDate) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
      values.push(filters.endDate);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
    }

    if (filters.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      values.push(filters.offset);
    }

    try {
      const result: QueryResult<Task> = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error finding tasks:', error);
      throw error;
    }
  }

  static async findById(id: string, userId?: string, includeDeleted: boolean = false): Promise<Task | null> {
    let query = includeDeleted 
      ? 'SELECT * FROM tasks WHERE id = $1'
      : 'SELECT * FROM tasks WHERE id = $1 AND deleted_at IS NULL';
    
    const values: any[] = [id];
    
    if (userId) {
      query += ' AND user_id = $2';
      values.push(userId);
    } else {
      query += ' AND user_id IS NULL';
    }
    
    try {
      const result: QueryResult<Task> = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding task by ID:', error);
      throw error;
    }
  }

  static async update(id: string, updateData: UpdateTaskInput): Promise<Task | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        paramCount++;
        fields.push(`${key} = $${paramCount}`);
        if (key === 'due_date' && value) {
          values.push(new Date(value as string));
        } else {
          values.push(value);
        }
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    paramCount++;
    const query = `
      UPDATE tasks 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    try {
      const result: QueryResult<Task> = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  // Soft delete - marks task as deleted but keeps it in database
  static async delete(id: string): Promise<boolean> {
    const query = 'UPDATE tasks SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL';
    
    try {
      const result = await pool.query(query, [id]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error soft deleting task:', error);
      throw error;
    }
  }

  // Hard delete - permanently removes task from database
  static async hardDelete(id: string): Promise<boolean> {
    const query = 'DELETE FROM tasks WHERE id = $1';
    
    try {
      const result = await pool.query(query, [id]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error hard deleting task:', error);
      throw error;
    }
  }

  // Restore a soft-deleted task
  static async restore(id: string): Promise<Task | null> {
    const query = 'UPDATE tasks SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING *';
    
    try {
      const result: QueryResult<Task> = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error restoring task:', error);
      throw error;
    }
  }

  static async getTodaysTasks(userId?: string): Promise<Task[]> {
    let query = `
      SELECT * FROM tasks 
      WHERE deleted_at IS NULL
        AND (
          DATE(created_at) = CURRENT_DATE
          OR DATE(due_date) >= CURRENT_DATE
        )`;
    
    const values: any[] = [];
    if (userId) {
      query += ` AND user_id = $1`;
      values.push(userId);
    }
    
    query += `
      ORDER BY 
        CASE 
          WHEN due_date IS NOT NULL AND DATE(due_date) = CURRENT_DATE THEN 1
          WHEN DATE(created_at) = CURRENT_DATE THEN 2
          ELSE 3
        END,
        CASE priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END,
        created_at ASC
    `;

    try {
      const result: QueryResult<Task> = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error getting today\'s tasks:', error);
      throw error;
    }
  }

  static async getOldTasks(): Promise<Task[]> {
    const query = `
      SELECT * FROM tasks 
      WHERE deleted_at IS NULL
        AND (
          (due_date IS NOT NULL AND DATE(due_date) < CURRENT_DATE)
          OR (due_date IS NULL AND DATE(created_at) < CURRENT_DATE)
        )
      ORDER BY 
        CASE WHEN due_date IS NOT NULL THEN due_date ELSE created_at END DESC
    `;

    try {
      const result: QueryResult<Task> = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting old tasks:', error);
      throw error;
    }
  }

  static async markAllOldTasksComplete(): Promise<number> {
    const query = `
      UPDATE tasks 
      SET completed = true 
      WHERE deleted_at IS NULL
        AND completed = false 
        AND (
          (due_date IS NOT NULL AND DATE(due_date) < CURRENT_DATE)
          OR (due_date IS NULL AND DATE(created_at) < CURRENT_DATE)
        )
    `;

    try {
      const result = await pool.query(query);
      return result.rowCount || 0;
    } catch (error) {
      console.error('Error marking old tasks complete:', error);
      throw error;
    }
  }

  static async deleteAllOldTasks(): Promise<number> {
    const query = `
      UPDATE tasks 
      SET deleted_at = NOW()
      WHERE deleted_at IS NULL
        AND (
          (due_date IS NOT NULL AND DATE(due_date) < CURRENT_DATE)
          OR (due_date IS NULL AND DATE(created_at) < CURRENT_DATE)
        )
    `;

    try {
      const result = await pool.query(query);
      return result.rowCount || 0;
    } catch (error) {
      console.error('Error deleting old tasks:', error);
      throw error;
    }
  }

  static async deleteCompletedOldTasks(): Promise<number> {
    const query = `
      UPDATE tasks 
      SET deleted_at = NOW()
      WHERE deleted_at IS NULL
        AND completed = true 
        AND (
          (due_date IS NOT NULL AND DATE(due_date) < CURRENT_DATE)
          OR (due_date IS NULL AND DATE(created_at) < CURRENT_DATE)
        )
    `;

    try {
      const result = await pool.query(query);
      return result.rowCount || 0;
    } catch (error) {
      console.error('Error deleting completed old tasks:', error);
      throw error;
    }
  }

  // Get deleted tasks (within TTL period)
  static async getDeletedTasks(): Promise<Task[]> {
    const query = `
      SELECT * FROM tasks 
      WHERE deleted_at IS NOT NULL
      ORDER BY deleted_at DESC
    `;

    try {
      const result: QueryResult<Task> = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting deleted tasks:', error);
      throw error;
    }
  }

  // Get task history
  static async getTaskHistory(taskId?: string, limit: number = 100): Promise<any[]> {
    const query = taskId 
      ? 'SELECT * FROM get_task_history($1, $2)'
      : 'SELECT * FROM get_task_history(NULL, $1)';
    
    const values = taskId ? [taskId, limit] : [limit];

    try {
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error getting task history:', error);
      throw error;
    }
  }

  // Cleanup expired deleted tasks
  static async cleanupExpiredTasks(): Promise<number> {
    const query = 'SELECT cleanup_expired_deleted_tasks() as deleted_count';

    try {
      const result = await pool.query(query);
      return result.rows[0].deleted_count || 0;
    } catch (error) {
      console.error('Error cleaning up expired tasks:', error);
      throw error;
    }
  }

  // Get tasks about to expire (for notifications)
  static async getTasksAboutToExpire(): Promise<any[]> {
    const query = 'SELECT * FROM expiring_deleted_tasks WHERE hours_until_expiry <= 2';

    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting tasks about to expire:', error);
      throw error;
    }
  }
}