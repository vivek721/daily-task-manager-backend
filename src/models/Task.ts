import pool from '../config/database';
import { Task, CreateTaskInput, UpdateTaskInput, TaskFilters } from '../types/Task';
import { QueryResult } from 'pg';

// Columns a client is allowed to change through TaskModel.update. Anything else in the
// payload (id, user_id, deleted_at, created_at, ...) is ignored so a caller can never
// re-assign a task to another user or inject SQL through a column name.
const UPDATABLE_COLUMNS: ReadonlyArray<keyof UpdateTaskInput> = [
  'title',
  'description',
  'completed',
  'priority',
  'due_date',
  'category',
  'tags',
];

// Overdue = due before today, or (no due date and) created before today.
const OVERDUE_CONDITION = `
  (
    (due_date IS NOT NULL AND DATE(due_date) < CURRENT_DATE)
    OR (due_date IS NULL AND DATE(created_at) < CURRENT_DATE)
  )`;

// Every method that reads or writes tasks requires the owning user's id and filters on
// `user_id`, so one user can never see or change another user's tasks.
export class TaskModel {
  static async create(taskData: CreateTaskInput, userId: string): Promise<Task> {
    const { title, description, priority = 'medium', due_date, category, tags } = taskData;

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
      userId,
    ];

    try {
      const result: QueryResult<Task> = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  static async findAll(filters: TaskFilters = {}, userId: string): Promise<Task[]> {
    let query = 'SELECT * FROM tasks WHERE deleted_at IS NULL AND user_id = $1';
    const values: any[] = [userId];
    let paramCount = 1;

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

  static async findById(
    id: string,
    userId: string,
    includeDeleted: boolean = false
  ): Promise<Task | null> {
    const query = includeDeleted
      ? 'SELECT * FROM tasks WHERE id = $1 AND user_id = $2'
      : 'SELECT * FROM tasks WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL';

    try {
      const result: QueryResult<Task> = await pool.query(query, [id, userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding task by ID:', error);
      throw error;
    }
  }

  static async update(
    id: string,
    userId: string,
    updateData: UpdateTaskInput
  ): Promise<Task | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    UPDATABLE_COLUMNS.forEach(key => {
      const value = updateData[key];
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

    const query = `
      UPDATE tasks
      SET ${fields.join(', ')}
      WHERE id = $${paramCount + 1} AND user_id = $${paramCount + 2}
      RETURNING *
    `;
    values.push(id, userId);

    try {
      const result: QueryResult<Task> = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  // Soft delete - marks task as deleted but keeps it in database
  static async delete(id: string, userId: string): Promise<boolean> {
    const query = `
      UPDATE tasks SET deleted_at = NOW()
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
    `;

    try {
      const result = await pool.query(query, [id, userId]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error soft deleting task:', error);
      throw error;
    }
  }

  // Hard delete - permanently removes task from database
  static async hardDelete(id: string, userId: string): Promise<boolean> {
    const query = 'DELETE FROM tasks WHERE id = $1 AND user_id = $2';

    try {
      const result = await pool.query(query, [id, userId]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error hard deleting task:', error);
      throw error;
    }
  }

  // Restore a soft-deleted task
  static async restore(id: string, userId: string): Promise<Task | null> {
    const query = `
      UPDATE tasks SET deleted_at = NULL
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NOT NULL
      RETURNING *
    `;

    try {
      const result: QueryResult<Task> = await pool.query(query, [id, userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error restoring task:', error);
      throw error;
    }
  }

  static async getTodaysTasks(userId: string): Promise<Task[]> {
    const query = `
      SELECT * FROM tasks
      WHERE deleted_at IS NULL
        AND user_id = $1
        AND (
          DATE(created_at) = CURRENT_DATE
          OR DATE(due_date) >= CURRENT_DATE
        )
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
      const result: QueryResult<Task> = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error("Error getting today's tasks:", error);
      throw error;
    }
  }

  static async getOldTasks(userId: string): Promise<Task[]> {
    const query = `
      SELECT * FROM tasks
      WHERE deleted_at IS NULL
        AND user_id = $1
        AND ${OVERDUE_CONDITION}
      ORDER BY
        CASE WHEN due_date IS NOT NULL THEN due_date ELSE created_at END DESC
    `;

    try {
      const result: QueryResult<Task> = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting old tasks:', error);
      throw error;
    }
  }

  static async markAllOldTasksComplete(userId: string): Promise<number> {
    const query = `
      UPDATE tasks
      SET completed = true
      WHERE deleted_at IS NULL
        AND user_id = $1
        AND completed = false
        AND ${OVERDUE_CONDITION}
    `;

    try {
      const result = await pool.query(query, [userId]);
      return result.rowCount || 0;
    } catch (error) {
      console.error('Error marking old tasks complete:', error);
      throw error;
    }
  }

  static async deleteAllOldTasks(userId: string): Promise<number> {
    const query = `
      UPDATE tasks
      SET deleted_at = NOW()
      WHERE deleted_at IS NULL
        AND user_id = $1
        AND ${OVERDUE_CONDITION}
    `;

    try {
      const result = await pool.query(query, [userId]);
      return result.rowCount || 0;
    } catch (error) {
      console.error('Error deleting old tasks:', error);
      throw error;
    }
  }

  static async deleteCompletedOldTasks(userId: string): Promise<number> {
    const query = `
      UPDATE tasks
      SET deleted_at = NOW()
      WHERE deleted_at IS NULL
        AND user_id = $1
        AND completed = true
        AND ${OVERDUE_CONDITION}
    `;

    try {
      const result = await pool.query(query, [userId]);
      return result.rowCount || 0;
    } catch (error) {
      console.error('Error deleting completed old tasks:', error);
      throw error;
    }
  }

  // Get deleted tasks (within TTL period)
  static async getDeletedTasks(userId: string): Promise<Task[]> {
    const query = `
      SELECT * FROM tasks
      WHERE deleted_at IS NOT NULL
        AND user_id = $1
      ORDER BY deleted_at DESC
    `;

    try {
      const result: QueryResult<Task> = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting deleted tasks:', error);
      throw error;
    }
  }

  // History for one task. Callers must check ownership first (see the controller), but
  // the task is joined on user_id here as well so the query can never leak another
  // user's history on its own.
  static async getTaskHistory(taskId: string, userId: string, limit: number = 100): Promise<any[]> {
    const query = `
      SELECT h.*
      FROM tasks t
      CROSS JOIN LATERAL get_task_history(t.id, $3) h
      WHERE t.id = $1 AND t.user_id = $2
    `;

    try {
      const result = await pool.query(query, [taskId, userId, limit]);
      return result.rows;
    } catch (error) {
      console.error('Error getting task history:', error);
      throw error;
    }
  }

  // History across all of a user's tasks (including soft-deleted ones).
  // get_task_history(NULL, limit) returns every user's history, so instead the function is
  // called once per task the user owns. Rows are grouped by task (most recently updated
  // task first) rather than globally ordered by change time, because the function's output
  // columns are defined in the database, not in this repo.
  static async getAllTaskHistory(userId: string, limit: number = 100): Promise<any[]> {
    const query = `
      SELECT h.*
      FROM (
        SELECT id FROM tasks WHERE user_id = $1 ORDER BY updated_at DESC
      ) t
      CROSS JOIN LATERAL get_task_history(t.id, $2) h
      LIMIT $2
    `;

    try {
      const result = await pool.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      console.error('Error getting task history:', error);
      throw error;
    }
  }

  // Permanently remove the user's own tasks that were soft-deleted more than a day ago
  // (the same TTL scripts/cleanup-deleted-tasks.js uses). The database-wide
  // cleanup_expired_deleted_tasks() function is left to that scheduled script.
  static async cleanupExpiredTasks(userId: string): Promise<number> {
    const query = `
      DELETE FROM tasks
      WHERE user_id = $1
        AND deleted_at IS NOT NULL
        AND deleted_at < NOW() - INTERVAL '1 day'
    `;

    try {
      const result = await pool.query(query, [userId]);
      return result.rowCount || 0;
    } catch (error) {
      console.error('Error cleaning up expired tasks:', error);
      throw error;
    }
  }

  // Get the user's deleted tasks that are about to expire (for notifications)
  static async getTasksAboutToExpire(userId: string): Promise<any[]> {
    const query = `
      SELECT e.* FROM expiring_deleted_tasks e
      WHERE e.hours_until_expiry <= 2
        AND e.id IN (SELECT t.id FROM tasks t WHERE t.user_id = $1)
    `;

    try {
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting tasks about to expire:', error);
      throw error;
    }
  }
}
