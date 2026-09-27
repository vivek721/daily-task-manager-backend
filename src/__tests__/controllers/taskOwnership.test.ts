import { Response } from 'express';
import { taskController } from '../../controllers/taskController';
import { TaskModel } from '../../models/Task';
import { AuthenticatedRequest } from '../../middleware/auth';

// Mock the TaskModel
jest.mock('../../models/Task');
jest.mock('../../config/database');

const MockedTaskModel = TaskModel as jest.Mocked<typeof TaskModel>;

const USER_ID = '11111111-1111-4111-8111-111111111111';
const TASK_ID = '22222222-2222-4222-8222-222222222222';

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<void>;

describe('Task Controller - ownership scoping', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  const ownTask = {
    id: TASK_ID,
    title: 'My Task',
    completed: false,
    priority: 'medium' as const,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const call = (handler: Handler): Promise<void> =>
    handler(mockRequest as AuthenticatedRequest, mockResponse as Response);

  const expectNotFound = (): void => {
    expect(responseStatus).toHaveBeenCalledWith(404);
    expect(responseJson).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  };

  beforeEach(() => {
    responseJson = jest.fn().mockReturnThis();
    responseStatus = jest.fn().mockReturnThis();

    mockResponse = {
      json: responseJson,
      status: responseStatus,
    };

    mockRequest = {
      user: {
        id: USER_ID,
        email: 'owner@example.com',
        name: 'Owner',
      },
      params: { id: TASK_ID },
      query: {},
      body: {},
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTaskById', () => {
    it('looks the task up with the authenticated user id', async () => {
      MockedTaskModel.findById = jest.fn().mockResolvedValue(ownTask);

      await call(taskController.getTaskById);

      expect(MockedTaskModel.findById).toHaveBeenCalledWith(TASK_ID, USER_ID);
      expect(responseJson).toHaveBeenCalledWith({ success: true, data: ownTask });
    });

    it('returns 404 for a task owned by another user', async () => {
      // The model filters on user_id, so another user's task is simply not found
      MockedTaskModel.findById = jest.fn().mockResolvedValue(null);

      await call(taskController.getTaskById);

      expect(MockedTaskModel.findById).toHaveBeenCalledWith(TASK_ID, USER_ID);
      expectNotFound();
    });
  });

  describe('updateTask', () => {
    it('updates only within the authenticated user\'s tasks', async () => {
      mockRequest.body = { title: 'Renamed' };
      MockedTaskModel.update = jest.fn().mockResolvedValue({ ...ownTask, title: 'Renamed' });

      await call(taskController.updateTask);

      expect(MockedTaskModel.update).toHaveBeenCalledWith(TASK_ID, USER_ID, { title: 'Renamed' });
      expect(responseStatus).not.toHaveBeenCalled();
    });

    it('returns 404 for a task owned by another user', async () => {
      mockRequest.body = { title: 'Hijacked' };
      MockedTaskModel.update = jest.fn().mockResolvedValue(null);

      await call(taskController.updateTask);

      expectNotFound();
    });

    it('returns 400 when the payload has no updatable fields', async () => {
      mockRequest.body = { user_id: 'someone-else' };
      MockedTaskModel.update = jest.fn().mockRejectedValue(new Error('No fields to update'));

      await call(taskController.updateTask);

      expect(responseStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('toggleTaskComplete', () => {
    it('toggles the task within the authenticated user\'s tasks', async () => {
      MockedTaskModel.findById = jest.fn().mockResolvedValue(ownTask);
      MockedTaskModel.update = jest.fn().mockResolvedValue({ ...ownTask, completed: true });

      await call(taskController.toggleTaskComplete);

      expect(MockedTaskModel.findById).toHaveBeenCalledWith(TASK_ID, USER_ID);
      expect(MockedTaskModel.update).toHaveBeenCalledWith(TASK_ID, USER_ID, { completed: true });
    });

    it('returns 404 and does not update a task owned by another user', async () => {
      MockedTaskModel.findById = jest.fn().mockResolvedValue(null);
      MockedTaskModel.update = jest.fn();

      await call(taskController.toggleTaskComplete);

      expectNotFound();
      expect(MockedTaskModel.update).not.toHaveBeenCalled();
    });
  });

  describe.each([
    ['deleteTask', 'delete', false],
    ['hardDeleteTask', 'hardDelete', false],
    ['restoreTask', 'restore', null],
  ] as const)('%s', (handlerName, modelMethod, notFoundValue) => {
    it('passes the task id and the authenticated user id to the model', async () => {
      (MockedTaskModel as any)[modelMethod] = jest.fn().mockResolvedValue(
        modelMethod === 'restore' ? ownTask : true
      );

      await call(taskController[handlerName]);

      expect((MockedTaskModel as any)[modelMethod]).toHaveBeenCalledWith(TASK_ID, USER_ID);
      expect(responseStatus).not.toHaveBeenCalled();
    });

    it('returns 404 for a task owned by another user', async () => {
      (MockedTaskModel as any)[modelMethod] = jest.fn().mockResolvedValue(notFoundValue);

      await call(taskController[handlerName]);

      expectNotFound();
    });
  });

  describe.each([
    ['getOldTasks', 'getOldTasks', []],
    ['getDeletedTasks', 'getDeletedTasks', []],
    ['getTasksAboutToExpire', 'getTasksAboutToExpire', []],
    ['markAllOldTasksComplete', 'markAllOldTasksComplete', 0],
    ['deleteAllOldTasks', 'deleteAllOldTasks', 0],
    ['deleteCompletedOldTasks', 'deleteCompletedOldTasks', 0],
    ['cleanupExpiredTasks', 'cleanupExpiredTasks', 0],
  ] as const)('%s', (handlerName, modelMethod, resolved) => {
    it('is scoped to the authenticated user', async () => {
      (MockedTaskModel as any)[modelMethod] = jest.fn().mockResolvedValue(resolved);

      await call(taskController[handlerName]);

      expect((MockedTaskModel as any)[modelMethod]).toHaveBeenCalledWith(USER_ID);
      expect(responseStatus).not.toHaveBeenCalled();
    });
  });

  describe('getTaskHistory', () => {
    it('returns history only after confirming the user owns the task', async () => {
      MockedTaskModel.findById = jest.fn().mockResolvedValue(ownTask);
      MockedTaskModel.getTaskHistory = jest.fn().mockResolvedValue([{ action: 'created' }]);

      await call(taskController.getTaskHistory);

      expect(MockedTaskModel.findById).toHaveBeenCalledWith(TASK_ID, USER_ID, true);
      expect(MockedTaskModel.getTaskHistory).toHaveBeenCalledWith(TASK_ID, USER_ID, 100);
    });

    it('returns 404 and no history for a task owned by another user', async () => {
      MockedTaskModel.findById = jest.fn().mockResolvedValue(null);
      MockedTaskModel.getTaskHistory = jest.fn();

      await call(taskController.getTaskHistory);

      expectNotFound();
      expect(MockedTaskModel.getTaskHistory).not.toHaveBeenCalled();
    });
  });

  describe('getAllTaskHistory', () => {
    it('is scoped to the authenticated user', async () => {
      mockRequest.query = { limit: '20' };
      MockedTaskModel.getAllTaskHistory = jest.fn().mockResolvedValue([]);

      await call(taskController.getAllTaskHistory);

      expect(MockedTaskModel.getAllTaskHistory).toHaveBeenCalledWith(USER_ID, 20);
    });
  });
});
