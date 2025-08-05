-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create subagents table
CREATE TABLE IF NOT EXISTS subagents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('developer', 'reviewer', 'tester', 'deployer', 'monitor', 'analyst')),
    description TEXT,
    capabilities TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive', 'busy')) DEFAULT 'active',
    load_capacity INTEGER NOT NULL DEFAULT 5,
    current_load INTEGER NOT NULL DEFAULT 0,
    specialization VARCHAR(100),
    priority_preference VARCHAR(10) CHECK (priority_preference IN ('low', 'medium', 'high')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create subagent assignments table
CREATE TABLE IF NOT EXISTS subagent_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    subagent_id UUID NOT NULL REFERENCES subagents(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('assigned', 'in_progress', 'completed', 'failed', 'reassigned')) DEFAULT 'assigned',
    assignment_reason TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    UNIQUE(task_id, subagent_id) -- Prevent duplicate assignments
);

-- Create assignment rules table
CREATE TABLE IF NOT EXISTS assignment_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    trigger_conditions JSONB NOT NULL,
    assignment_criteria JSONB NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subagents_type ON subagents(type);
CREATE INDEX IF NOT EXISTS idx_subagents_status ON subagents(status);
CREATE INDEX IF NOT EXISTS idx_subagents_specialization ON subagents(specialization);
CREATE INDEX IF NOT EXISTS idx_subagents_load ON subagents(current_load, load_capacity);

CREATE INDEX IF NOT EXISTS idx_assignments_task_id ON subagent_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subagent_id ON subagent_assignments(subagent_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON subagent_assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_assigned_at ON subagent_assignments(assigned_at);

CREATE INDEX IF NOT EXISTS idx_assignment_rules_priority ON assignment_rules(priority DESC);
CREATE INDEX IF NOT EXISTS idx_assignment_rules_active ON assignment_rules(active);

-- Create trigger to automatically update updated_at timestamp for subagents
CREATE OR REPLACE FUNCTION update_subagent_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subagent_updated_at BEFORE UPDATE ON subagents
    FOR EACH ROW EXECUTE FUNCTION update_subagent_updated_at_column();

CREATE TRIGGER update_assignment_rule_updated_at BEFORE UPDATE ON assignment_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update subagent load when assignments change
CREATE OR REPLACE FUNCTION update_subagent_load()
RETURNS TRIGGER AS $$
BEGIN
    -- Update load for new assignment
    IF TG_OP = 'INSERT' THEN
        UPDATE subagents 
        SET current_load = current_load + 1,
            status = CASE 
                WHEN current_load + 1 >= load_capacity THEN 'busy'
                ELSE status
            END
        WHERE id = NEW.subagent_id;
        RETURN NEW;
    END IF;
    
    -- Update load for removed assignment
    IF TG_OP = 'DELETE' THEN
        UPDATE subagents 
        SET current_load = GREATEST(current_load - 1, 0),
            status = CASE 
                WHEN current_load - 1 < load_capacity AND status = 'busy' THEN 'active'
                ELSE status
            END
        WHERE id = OLD.subagent_id;
        RETURN OLD;
    END IF;
    
    -- Update load for changed assignment
    IF TG_OP = 'UPDATE' THEN
        -- If subagent changed
        IF OLD.subagent_id != NEW.subagent_id THEN
            -- Decrease old subagent load
            UPDATE subagents 
            SET current_load = GREATEST(current_load - 1, 0),
                status = CASE 
                    WHEN current_load - 1 < load_capacity AND status = 'busy' THEN 'active'
                    ELSE status
                END
            WHERE id = OLD.subagent_id;
            
            -- Increase new subagent load
            UPDATE subagents 
            SET current_load = current_load + 1,
                status = CASE 
                    WHEN current_load + 1 >= load_capacity THEN 'busy'
                    ELSE status
                END
            WHERE id = NEW.subagent_id;
        END IF;
        
        -- If assignment completed or failed, decrease load
        IF OLD.status IN ('assigned', 'in_progress') AND NEW.status IN ('completed', 'failed') THEN
            UPDATE subagents 
            SET current_load = GREATEST(current_load - 1, 0),
                status = CASE 
                    WHEN current_load - 1 < load_capacity AND status = 'busy' THEN 'active'
                    ELSE status
                END
            WHERE id = NEW.subagent_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Create triggers for load management
CREATE TRIGGER manage_subagent_load_insert
    AFTER INSERT ON subagent_assignments
    FOR EACH ROW EXECUTE FUNCTION update_subagent_load();

CREATE TRIGGER manage_subagent_load_update
    AFTER UPDATE ON subagent_assignments
    FOR EACH ROW EXECUTE FUNCTION update_subagent_load();

CREATE TRIGGER manage_subagent_load_delete
    AFTER DELETE ON subagent_assignments
    FOR EACH ROW EXECUTE FUNCTION update_subagent_load();

-- Insert some default subagents
INSERT INTO subagents (name, type, description, capabilities, load_capacity, specialization) VALUES
('Frontend Dev Agent', 'developer', 'Specialized in frontend development tasks', ARRAY['frontend_development', 'ui_ux_design', 'code_review'], 3, 'frontend'),
('Backend Dev Agent', 'developer', 'Specialized in backend development tasks', ARRAY['backend_development', 'api_development', 'database_management'], 5, 'backend'),
('QA Test Agent', 'tester', 'Automated testing and quality assurance', ARRAY['testing', 'integration_testing', 'bug_fixing'], 4, 'testing'),
('Code Review Agent', 'reviewer', 'Code review and quality checks', ARRAY['code_review', 'security_analysis', 'performance_optimization'], 6, 'code_quality'),
('Deploy Agent', 'deployer', 'Deployment and infrastructure management', ARRAY['deployment', 'monitoring', 'performance_optimization'], 2, 'devops'),
('Data Analyst Agent', 'analyst', 'Data analysis and reporting tasks', ARRAY['monitoring', 'documentation', 'performance_optimization'], 3, 'analytics')
ON CONFLICT (name) DO NOTHING;

-- Insert some default assignment rules
INSERT INTO assignment_rules (name, description, trigger_conditions, assignment_criteria, priority) VALUES
('High Priority Frontend Tasks', 'Auto-assign high priority frontend tasks', 
 '[{"field": "priority", "operator": "equals", "value": "high"}, {"field": "category", "operator": "contains", "value": "frontend"}]',
 '{"subagent_type": "developer", "specialization": "frontend", "prefer_low_load": true}',
 100),
('Backend API Tasks', 'Auto-assign backend API development tasks',
 '[{"field": "title", "operator": "contains", "value": "API"}, {"field": "category", "operator": "equals", "value": "backend"}]',
 '{"subagent_type": "developer", "specialization": "backend", "required_capabilities": ["api_development"]}',
 80),
('Bug Fix Tasks', 'Auto-assign bug fixing tasks to testers first',
 '[{"field": "title", "operator": "contains", "value": "bug"}, {"field": "title", "operator": "contains", "value": "fix"}]',
 '{"subagent_type": "tester", "required_capabilities": ["bug_fixing"], "prefer_low_load": true}',
 90),
('Testing Tasks', 'Auto-assign testing related tasks',
 '[{"field": "category", "operator": "equals", "value": "testing"}]',
 '{"subagent_type": "tester", "required_capabilities": ["testing"]}',
 70),
('Deployment Tasks', 'Auto-assign deployment tasks',
 '[{"field": "title", "operator": "contains", "value": "deploy"}, {"field": "category", "operator": "equals", "value": "deployment"}]',
 '{"subagent_type": "deployer", "required_capabilities": ["deployment"]}',
 85)
ON CONFLICT (name) DO NOTHING;