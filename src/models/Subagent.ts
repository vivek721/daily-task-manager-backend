import { Pool } from 'pg';
import { 
  Subagent, 
  SubagentAssignment, 
  AssignmentRule, 
  CreateSubagentInput, 
  UpdateSubagentInput,
  CreateAssignmentRuleInput,
  UpdateAssignmentRuleInput,
  TriggerCondition,
  AssignmentCriteria
} from '../types/Subagent';

export class SubagentModel {
  constructor(private pool: Pool) {}

  // Subagent CRUD operations
  async findAllSubagents(): Promise<Subagent[]> {
    const query = `
      SELECT * FROM subagents 
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  async findSubagentById(id: string): Promise<Subagent | null> {
    const query = 'SELECT * FROM subagents WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async createSubagent(data: CreateSubagentInput): Promise<Subagent> {
    const query = `
      INSERT INTO subagents (name, type, description, capabilities, load_capacity, specialization, priority_preference)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      data.name,
      data.type,
      data.description,
      data.capabilities,
      data.load_capacity,
      data.specialization,
      data.priority_preference
    ];
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async updateSubagent(id: string, data: UpdateSubagentInput): Promise<Subagent | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Only known columns are written; other body keys are ignored so they can't be
    // interpolated into the SQL as column names.
    const updatableColumns: ReadonlyArray<keyof UpdateSubagentInput> = [
      'name',
      'description',
      'capabilities',
      'status',
      'load_capacity',
      'specialization',
      'priority_preference'
    ];

    updatableColumns.forEach((key) => {
      const value = data[key];
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) return null;

    const query = `
      UPDATE subagents 
      SET ${fields.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    const result = await this.pool.query(query, values);
    return result.rows[0] || null;
  }

  async deleteSubagent(id: string): Promise<boolean> {
    const query = 'DELETE FROM subagents WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  // Assignment operations
  async assignTaskToSubagent(
    taskId: string, 
    subagentId: string, 
    reason: string,
    metadata?: Record<string, any>
  ): Promise<SubagentAssignment> {
    const query = `
      INSERT INTO subagent_assignments (task_id, subagent_id, assignment_reason, metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [taskId, subagentId, reason, JSON.stringify(metadata || {})];
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getTaskAssignments(taskId: string): Promise<SubagentAssignment[]> {
    const query = `
      SELECT sa.*, s.name as subagent_name, s.type as subagent_type
      FROM subagent_assignments sa
      JOIN subagents s ON sa.subagent_id = s.id
      WHERE sa.task_id = $1
      ORDER BY sa.assigned_at DESC
    `;
    const result = await this.pool.query(query, [taskId]);
    return result.rows;
  }

  // Active assignments of a subagent, limited to tasks owned by the given user
  async getSubagentAssignments(subagentId: string, userId: string): Promise<SubagentAssignment[]> {
    const query = `
      SELECT sa.*, t.title as task_title, t.priority as task_priority
      FROM subagent_assignments sa
      JOIN tasks t ON sa.task_id = t.id
      WHERE sa.subagent_id = $1
        AND t.user_id = $2
        AND sa.status IN ('assigned', 'in_progress')
      ORDER BY sa.assigned_at DESC
    `;
    const result = await this.pool.query(query, [subagentId, userId]);
    return result.rows;
  }

  // Only updates the assignment if its task belongs to the given user
  async updateAssignmentStatus(
    assignmentId: string,
    status: SubagentAssignment['status'],
    userId: string
  ): Promise<SubagentAssignment | null> {
    const query = `
      UPDATE subagent_assignments sa
      SET status = $1, completed_at = CASE WHEN $1 IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE NULL END
      FROM tasks t
      WHERE sa.id = $2
        AND sa.task_id = t.id
        AND t.user_id = $3
      RETURNING sa.*
    `;
    const result = await this.pool.query(query, [status, assignmentId, userId]);
    return result.rows[0] || null;
  }

  // Assignment Rules CRUD
  async findAllAssignmentRules(): Promise<AssignmentRule[]> {
    const query = `
      SELECT * FROM assignment_rules 
      WHERE active = true
      ORDER BY priority DESC, created_at DESC
    `;
    const result = await this.pool.query(query);
    return result.rows.map(row => ({
      ...row,
      trigger_conditions: JSON.parse(row.trigger_conditions),
      assignment_criteria: JSON.parse(row.assignment_criteria)
    }));
  }

  async createAssignmentRule(data: CreateAssignmentRuleInput): Promise<AssignmentRule> {
    const query = `
      INSERT INTO assignment_rules (name, description, trigger_conditions, assignment_criteria, priority)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      data.name,
      data.description,
      JSON.stringify(data.trigger_conditions),
      JSON.stringify(data.assignment_criteria),
      data.priority
    ];
    
    const result = await this.pool.query(query, values);
    const row = result.rows[0];
    return {
      ...row,
      trigger_conditions: JSON.parse(row.trigger_conditions),
      assignment_criteria: JSON.parse(row.assignment_criteria)
    };
  }

  // Auto-assignment logic
  async findEligibleSubagents(criteria: AssignmentCriteria): Promise<Subagent[]> {
    let query = `
      SELECT * FROM subagents 
      WHERE status = 'active' AND current_load < load_capacity
    `;
    const values: any[] = [];
    let paramCount = 1;

    if (criteria.subagent_type) {
      query += ` AND type = $${paramCount}`;
      values.push(criteria.subagent_type);
      paramCount++;
    }

    if (criteria.specialization) {
      query += ` AND specialization = $${paramCount}`;
      values.push(criteria.specialization);
      paramCount++;
    }

    if (criteria.min_capacity) {
      query += ` AND (load_capacity - current_load) >= $${paramCount}`;
      values.push(criteria.min_capacity);
      paramCount++;
    }

    if (criteria.required_capabilities && criteria.required_capabilities.length > 0) {
      query += ` AND capabilities @> $${paramCount}`;
      values.push(criteria.required_capabilities);
      paramCount++;
    }

    if (criteria.prefer_low_load) {
      query += ` ORDER BY current_load ASC, created_at ASC`;
    } else {
      query += ` ORDER BY created_at ASC`;
    }

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async evaluateTaskForRules(task: any): Promise<{ rule: AssignmentRule; subagent: Subagent } | null> {
    const rules = await this.findAllAssignmentRules();
    
    for (const rule of rules) {
      if (this.doesTaskMatchRule(task, rule)) {
        const eligibleSubagents = await this.findEligibleSubagents(rule.assignment_criteria);
        if (eligibleSubagents.length > 0) {
          return { rule, subagent: eligibleSubagents[0] };
        }
      }
    }
    
    return null;
  }

  private doesTaskMatchRule(task: any, rule: AssignmentRule): boolean {
    return rule.trigger_conditions.every(condition => {
      const fieldValue = task[condition.field];
      if (!fieldValue) return false;

      const value = condition.case_sensitive ? fieldValue : fieldValue.toLowerCase();
      const conditionValue = condition.case_sensitive ? condition.value : condition.value.toLowerCase();

      switch (condition.operator) {
        case 'equals':
          return value === conditionValue;
        case 'contains':
          return value.includes(conditionValue);
        case 'starts_with':
          return value.startsWith(conditionValue);
        case 'ends_with':
          return value.endsWith(conditionValue);
        case 'matches_regex':
          try {
            const regex = new RegExp(condition.value, condition.case_sensitive ? 'g' : 'gi');
            return regex.test(value);
          } catch {
            return false;
          }
        default:
          return false;
      }
    });
  }

  // Statistics and monitoring
  async getSubagentStats(): Promise<any> {
    const query = `
      SELECT 
        s.id,
        s.name,
        s.type,
        s.status,
        s.current_load,
        s.load_capacity,
        ROUND((s.current_load::float / s.load_capacity::float) * 100, 2) as load_percentage,
        COUNT(sa.id) as total_assignments,
        COUNT(CASE WHEN sa.status = 'completed' THEN 1 END) as completed_assignments,
        COUNT(CASE WHEN sa.status = 'failed' THEN 1 END) as failed_assignments
      FROM subagents s
      LEFT JOIN subagent_assignments sa ON s.id = sa.subagent_id
      GROUP BY s.id, s.name, s.type, s.status, s.current_load, s.load_capacity
      ORDER BY s.name
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  // Assignment history limited to tasks owned by the given user
  async getAssignmentHistory(userId: string, limit: number = 50): Promise<any[]> {
    const query = `
      SELECT 
        sa.*,
        s.name as subagent_name,
        s.type as subagent_type,
        t.title as task_title,
        t.priority as task_priority,
        t.category as task_category
      FROM subagent_assignments sa
      JOIN subagents s ON sa.subagent_id = s.id
      JOIN tasks t ON sa.task_id = t.id
      WHERE t.user_id = $1
      ORDER BY sa.assigned_at DESC
      LIMIT $2
    `;
    const result = await this.pool.query(query, [userId, limit]);
    return result.rows;
  }
}