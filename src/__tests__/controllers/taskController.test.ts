import { Request, Response } from 'express';
import { taskController } from '../../controllers/taskController';
import { TaskModel } from '../../models/Task';
import { AuthenticatedRequest } from '../../middleware/auth';

// Mock the TaskModel
jest.mock('../../models/Task');
jest.mock('../../config/database');

const MockedTaskModel = TaskModel as jest.Mocked<typeof TaskModel>;

describe('Task Controller', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    responseJson = jest.fn().mockReturnThis();
    responseStatus = jest.fn().mockReturnThis();
    
    mockResponse = {
      json: responseJson,
      status: responseStatus,
    };
    
    mockRequest = {
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        google_id: 'google-123',
        created_at: new Date(),
        updated_at: new Date(),
      },
      query: {},
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllTasks', () => {
    it('should return all tasks for authenticated user', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Test Task 1',
          description: 'Description 1',
          completed: false,
          priority: 'medium',
          category: 'work',
          user_id: 'test-user-123',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'task-2',
          title: 'Test Task 2',
          description: 'Description 2',
          completed: true,
          priority: 'high',
          category: 'personal',
          user_id: 'test-user-123',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      MockedTaskModel.findAll = jest.fn().mockResolvedValue(mockTasks);

      await taskController.getAllTasks(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(MockedTaskModel.findAll).toHaveBeenCalledWith(
        {
          completed: undefined,
          priority: undefined,
          category: undefined,
          limit: undefined,
          offset: undefined,
        },
        'test-user-123'
      );

      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: mockTasks,
        count: 2,
      });
    });

    it('should handle query filters correctly', async () => {
      mockRequest.query = {
        completed: 'true',
        priority: 'high',
        category: 'work',
        limit: '10',
        offset: '0',
      };

      MockedTaskModel.findAll = jest.fn().mockResolvedValue([]);

      await taskController.getAllTasks(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(MockedTaskModel.findAll).toHaveBeenCalledWith(
        {
          completed: true,
          priority: 'high',
          category: 'work',
          limit: 10,
          offset: 0,
        },
        'test-user-123'
      );
    });

    it('should handle database errors gracefully', async () => {
      MockedTaskModel.findAll = jest.fn().mockRejectedValue(new Error('Database error'));

      await taskController.getAllTasks(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve tasks',
      });
    });
  });

  describe('getTodaysTasks', () => {
    it('should return today\'s tasks for authenticated user', async () => {
      const mockTasks = [
        {
          id: 'task-today',
          title: 'Today\'s Task',
          description: 'Task for today',
          completed: false,
          priority: 'high',
          category: 'work',
          due_date: new Date(),
          user_id: 'test-user-123',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      MockedTaskModel.getTodaysTasks = jest.fn().mockResolvedValue(mockTasks);

      await taskController.getTodaysTasks(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(MockedTaskModel.getTodaysTasks).toHaveBeenCalledWith('test-user-123');
      expect(responseJson).toHaveBeenCalledWith({
        success: true,
        data: mockTasks,
        count: 1,
      });
    });

    it('should handle errors when fetching today\'s tasks', async () => {
      MockedTaskModel.getTodaysTasks = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      await taskController.getTodaysTasks(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve today\'s tasks',
      });
    });
  });
});