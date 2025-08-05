export interface Subagent {
  id: string;
  name: string;
  type: SubagentType;
  description?: string;
  capabilities: string[];
  status: 'active' | 'inactive' | 'busy';
  load_capacity: number; // Max number of concurrent tasks
  current_load: number; // Current number of assigned tasks
  specialization?: string; // e.g., 'frontend', 'backend', 'database', 'testing'
  priority_preference?: 'low' | 'medium' | 'high'; // Preferred task priority
  created_at: Date;
  updated_at: Date;
}

export type SubagentType = 
  | 'developer' 
  | 'reviewer' 
  | 'tester' 
  | 'deployer' 
  | 'monitor' 
  | 'analyst';

export interface SubagentAssignment {
  id: string;
  task_id: string;
  subagent_id: string;
  assigned_at: Date;
  completed_at?: Date;
  status: 'assigned' | 'in_progress' | 'completed' | 'failed' | 'reassigned';
  assignment_reason: string; // Why this subagent was chosen
  metadata?: Record<string, any>; // Additional assignment data
}

export interface AssignmentRule {
  id: string;
  name: string;
  description?: string;
  trigger_conditions: TriggerCondition[];
  assignment_criteria: AssignmentCriteria;
  priority: number; // Higher number = higher priority
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TriggerCondition {
  field: string; // e.g., 'priority', 'category', 'title', 'description'
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'matches_regex';
  value: string;
  case_sensitive?: boolean;
}

export interface AssignmentCriteria {
  subagent_type?: SubagentType;
  specialization?: string;
  min_capacity?: number; // Minimum available capacity required
  prefer_low_load?: boolean; // Prefer subagents with lower current load
  required_capabilities?: string[];
}

export interface CreateSubagentInput {
  name: string;
  type: SubagentType;
  description?: string;
  capabilities: string[];
  load_capacity: number;
  specialization?: string;
  priority_preference?: 'low' | 'medium' | 'high';
}

export interface UpdateSubagentInput {
  name?: string;
  description?: string;
  capabilities?: string[];
  status?: 'active' | 'inactive' | 'busy';
  load_capacity?: number;
  specialization?: string;
  priority_preference?: 'low' | 'medium' | 'high';
}

export interface CreateAssignmentRuleInput {
  name: string;
  description?: string;
  trigger_conditions: TriggerCondition[];
  assignment_criteria: AssignmentCriteria;
  priority: number;
}

export interface UpdateAssignmentRuleInput {
  name?: string;
  description?: string;
  trigger_conditions?: TriggerCondition[];
  assignment_criteria?: AssignmentCriteria;
  priority?: number;
  active?: boolean;
}

// Predefined subagent capabilities
export const SUBAGENT_CAPABILITIES = [
  'code_review',
  'testing',
  'deployment',
  'monitoring',
  'documentation',
  'frontend_development',
  'backend_development',
  'database_management',
  'performance_optimization',
  'security_analysis',
  'bug_fixing',
  'feature_development',
  'integration_testing',
  'ui_ux_design',
  'api_development'
] as const;

export type SubagentCapability = typeof SUBAGENT_CAPABILITIES[number];