import { Pool } from 'pg';
import { SubagentModel } from '../../models/Subagent';
import { Task } from '../../types/Task';

const rule = {
  id: 'rule-1',
  name: 'Backend API Tasks',
  priority: 80,
  active: true,
  created_at: new Date(),
  updated_at: new Date(),
};
const triggerConditions = [{ field: 'title', operator: 'contains', value: 'API' }];
const assignmentCriteria = { subagent_type: 'developer', specialization: 'backend' };

describe('SubagentModel - assignment rules', () => {
  const query = jest.fn();
  const model = new SubagentModel({ query } as unknown as Pool);

  beforeEach(() => {
    query.mockReset();
  });

  it('accepts JSONB columns already parsed by node-postgres', async () => {
    query.mockResolvedValue({
      rows: [
        { ...rule, trigger_conditions: triggerConditions, assignment_criteria: assignmentCriteria },
      ],
    });

    const rules = await model.findAllAssignmentRules();

    expect(rules[0].trigger_conditions).toEqual(triggerConditions);
    expect(rules[0].assignment_criteria).toEqual(assignmentCriteria);
  });

  it('still parses JSON columns returned as strings', async () => {
    query.mockResolvedValue({
      rows: [
        {
          ...rule,
          trigger_conditions: JSON.stringify(triggerConditions),
          assignment_criteria: JSON.stringify(assignmentCriteria),
        },
      ],
    });

    const rules = await model.findAllAssignmentRules();

    expect(rules[0].trigger_conditions).toEqual(triggerConditions);
  });

  it('matches a task against a rule and picks an eligible subagent', async () => {
    const subagent = { id: 'sub-1', name: 'Backend Dev Agent' };
    query
      .mockResolvedValueOnce({
        rows: [
          {
            ...rule,
            trigger_conditions: triggerConditions,
            assignment_criteria: assignmentCriteria,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [subagent] });

    const match = await model.evaluateTaskForRules({ title: 'Build the API' } as Task);

    expect(match?.subagent).toEqual(subagent);
    expect(match?.rule.name).toBe('Backend API Tasks');
  });
});
