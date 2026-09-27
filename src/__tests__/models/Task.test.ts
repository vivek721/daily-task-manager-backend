import pool from '../../config/database';
import { TaskModel } from '../../models/Task';

// Replace the pg pool with a mock so the generated SQL can be inspected
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

const mockQuery = pool.query as unknown as jest.Mock;

const USER_ID = '11111111-1111-4111-8111-111111111111';
const TASK_ID = '22222222-2222-4222-8222-222222222222';

const lastCall = (): { sql: string; values: unknown[] } => {
  const [sql, values] = mockQuery.mock.calls[mockQuery.mock.calls.length - 1];
  return { sql: String(sql).replace(/\s+/g, ' '), values: values || [] };
};

// Asserts that the query filters on user_id and binds the user id to that placeholder
const expectScopedToUser = (): void => {
  const { sql, values } = lastCall();
  const match = sql.match(/user_id = \$(\d+)/);
  expect(match).not.toBeNull();
  expect(values[Number(match![1]) - 1]).toBe(USER_ID);
};

describe('TaskModel - ownership scoping', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('findAll filters on the user id', async () => {
    await TaskModel.findAll({ completed: true, limit: 5 }, USER_ID);
    expectScopedToUser();
    expect(lastCall().sql).not.toContain('user_id IS NULL');
  });

  it('findById matches on both task id and user id', async () => {
    await TaskModel.findById(TASK_ID, USER_ID);
    expectScopedToUser();
    expect(lastCall().values).toEqual([TASK_ID, USER_ID]);
    expect(lastCall().sql).not.toContain('user_id IS NULL');
  });

  it('findById can include soft-deleted tasks and is still scoped', async () => {
    await TaskModel.findById(TASK_ID, USER_ID, true);
    expectScopedToUser();
    expect(lastCall().sql).not.toContain('deleted_at IS NULL');
  });

  it('create stores the owner', async () => {
    await TaskModel.create({ title: 'New' }, USER_ID);
    expect(lastCall().values).toContain(USER_ID);
  });

  it('update is scoped to the user and ignores non-updatable columns', async () => {
    const payload = { title: 'Renamed', user_id: 'attacker', id: 'x', 'deleted_at = NULL --': 1 };
    await TaskModel.update(TASK_ID, USER_ID, payload as any);

    expectScopedToUser();
    const { sql, values } = lastCall();
    expect(sql).toContain('SET title = $1 WHERE');
    expect(sql).not.toContain('deleted_at = NULL --');
    expect(values).toEqual(['Renamed', TASK_ID, USER_ID]);
  });

  it('update throws when no updatable fields are provided', async () => {
    await expect(TaskModel.update(TASK_ID, USER_ID, { user_id: 'x' } as any)).rejects.toThrow(
      'No fields to update'
    );
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it.each([
    ['delete', (): Promise<unknown> => TaskModel.delete(TASK_ID, USER_ID)],
    ['hardDelete', (): Promise<unknown> => TaskModel.hardDelete(TASK_ID, USER_ID)],
    ['restore', (): Promise<unknown> => TaskModel.restore(TASK_ID, USER_ID)],
    ['getTaskHistory', (): Promise<unknown> => TaskModel.getTaskHistory(TASK_ID, USER_ID, 10)],
  ])('%s matches on both task id and user id', async (_name, run) => {
    await run();
    expectScopedToUser();
    expect(lastCall().values).toContain(TASK_ID);
  });

  it.each([
    ['getTodaysTasks', (): Promise<unknown> => TaskModel.getTodaysTasks(USER_ID)],
    ['getOldTasks', (): Promise<unknown> => TaskModel.getOldTasks(USER_ID)],
    ['markAllOldTasksComplete', (): Promise<unknown> => TaskModel.markAllOldTasksComplete(USER_ID)],
    ['deleteAllOldTasks', (): Promise<unknown> => TaskModel.deleteAllOldTasks(USER_ID)],
    ['deleteCompletedOldTasks', (): Promise<unknown> => TaskModel.deleteCompletedOldTasks(USER_ID)],
    ['getDeletedTasks', (): Promise<unknown> => TaskModel.getDeletedTasks(USER_ID)],
    ['getAllTaskHistory', (): Promise<unknown> => TaskModel.getAllTaskHistory(USER_ID, 10)],
    ['cleanupExpiredTasks', (): Promise<unknown> => TaskModel.cleanupExpiredTasks(USER_ID)],
    ['getTasksAboutToExpire', (): Promise<unknown> => TaskModel.getTasksAboutToExpire(USER_ID)],
  ])('%s is scoped to the user', async (_name, run) => {
    await run();
    expectScopedToUser();
  });
});
