import express, { Response } from 'express';
import request from 'supertest';
import { subagentController } from '../../controllers/subagentController';
import subagentRoutes from '../../routes/subagentRoutes';
import { TaskModel } from '../../models/Task';
import { SubagentModel } from '../../models/Subagent';
import { AuthenticatedRequest } from '../../middleware/auth';

jest.mock('../../models/Task');
jest.mock('../../models/Subagent');
jest.mock('../../models/User');
jest.mock('../../config/database');

const MockedTaskModel = TaskModel as jest.Mocked<typeof TaskModel>;
// The controller creates one SubagentModel at import time; its methods live on the
// (auto-mocked) prototype.
const subagentProto = SubagentModel.prototype as jest.Mocked<SubagentModel>;

const USER_ID = '11111111-1111-4111-8111-111111111111';
const TASK_ID = '22222222-2222-4222-8222-222222222222';
const SUBAGENT_ID = '33333333-3333-4333-8333-333333333333';
const ASSIGNMENT_ID = '44444444-4444-4444-8444-444444444444';

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<void>;

describe('/api/subagents routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/subagents', subagentRoutes);

  it('rejects requests without a token', async () => {
    const response = await request(app).get('/api/subagents').expect(401);
    expect(response.body).toEqual({ error: 'Access token required' });
    expect(subagentProto.findAllSubagents).not.toHaveBeenCalled();
  });

  it('rejects requests with an invalid token', async () => {
    await request(app)
      .post('/api/subagents/rules')
      .set('Authorization', 'Bearer not-a-jwt')
      .expect(401);
    expect(subagentProto.createAssignmentRule).not.toHaveBeenCalled();
  });
});

describe('Subagent Controller - task ownership', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  const call = (handler: Handler): Promise<void> =>
    handler(mockRequest as AuthenticatedRequest, mockResponse as Response);

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
      params: { taskId: TASK_ID, subagentId: SUBAGENT_ID, assignmentId: ASSIGNMENT_ID },
      query: {},
      body: { reason: 'manual', status: 'completed' },
    };
  });

  describe('assignTaskToSubagent', () => {
    it('assigns a task the user owns', async () => {
      MockedTaskModel.findById = jest.fn().mockResolvedValue({ id: TASK_ID });
      subagentProto.assignTaskToSubagent.mockResolvedValue({ id: ASSIGNMENT_ID } as any);

      await call(subagentController.assignTaskToSubagent);

      expect(MockedTaskModel.findById).toHaveBeenCalledWith(TASK_ID, USER_ID);
      expect(responseStatus).toHaveBeenCalledWith(201);
    });

    it("returns 404 and assigns nothing for another user's task", async () => {
      MockedTaskModel.findById = jest.fn().mockResolvedValue(null);

      await call(subagentController.assignTaskToSubagent);

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(subagentProto.assignTaskToSubagent).not.toHaveBeenCalled();
    });
  });

  describe('getTaskAssignments', () => {
    it("returns 404 and no assignments for another user's task", async () => {
      MockedTaskModel.findById = jest.fn().mockResolvedValue(null);

      await call(subagentController.getTaskAssignments);

      expect(MockedTaskModel.findById).toHaveBeenCalledWith(TASK_ID, USER_ID, true);
      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(subagentProto.getTaskAssignments).not.toHaveBeenCalled();
    });
  });

  describe('autoAssignTask', () => {
    it("returns 404 and does not evaluate rules for another user's task", async () => {
      MockedTaskModel.findById = jest.fn().mockResolvedValue(null);

      await call(subagentController.autoAssignTask);

      expect(MockedTaskModel.findById).toHaveBeenCalledWith(TASK_ID, USER_ID);
      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(subagentProto.evaluateTaskForRules).not.toHaveBeenCalled();
    });
  });

  describe('assignment listings and updates', () => {
    it("scopes a subagent's assignments to the user", async () => {
      subagentProto.getSubagentAssignments.mockResolvedValue([]);

      await call(subagentController.getSubagentAssignments);

      expect(subagentProto.getSubagentAssignments).toHaveBeenCalledWith(SUBAGENT_ID, USER_ID);
    });

    it('scopes assignment history to the user', async () => {
      subagentProto.getAssignmentHistory.mockResolvedValue([]);

      await call(subagentController.getAssignmentHistory);

      expect(subagentProto.getAssignmentHistory).toHaveBeenCalledWith(USER_ID, 50);
    });

    it("returns 404 when updating an assignment of another user's task", async () => {
      subagentProto.updateAssignmentStatus.mockResolvedValue(null);

      await call(subagentController.updateAssignmentStatus);

      expect(subagentProto.updateAssignmentStatus).toHaveBeenCalledWith(
        ASSIGNMENT_ID,
        'completed',
        USER_ID
      );
      expect(responseStatus).toHaveBeenCalledWith(404);
    });
  });
});
