import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { devLogin, DEV_USER } from '../../controllers/authController';
import { authenticateToken, AuthenticatedRequest } from '../../middleware/auth';
import { UserModel } from '../../models/User';

jest.mock('../../models/User');
jest.mock('../../config/database');

const MockedUserModel = UserModel as jest.Mocked<typeof UserModel>;

const DEV_USER_ID = '55555555-5555-4555-8555-555555555555';

const devUserRow = {
  id: DEV_USER_ID,
  email: DEV_USER.email,
  name: DEV_USER.name,
  username: DEV_USER.username,
  auth_type: 'local' as const,
  created_at: new Date(),
  updated_at: new Date(),
};

describe('devLogin', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    responseJson = jest.fn().mockReturnThis();
    responseStatus = jest.fn().mockReturnThis();
    mockResponse = { json: responseJson, status: responseStatus };
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it.each(['production', 'test', 'staging', undefined])(
    'returns 404 when NODE_ENV is %s',
    async env => {
      if (env === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = env;
      }
      MockedUserModel.findOrCreate = jest.fn();

      await devLogin({} as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(404);
      expect(MockedUserModel.findOrCreate).not.toHaveBeenCalled();
    }
  );

  it('upserts a real dev user and issues a token that authenticateToken accepts', async () => {
    process.env.NODE_ENV = 'development';
    MockedUserModel.findOrCreate = jest.fn().mockResolvedValue(devUserRow);

    await devLogin({} as Request, mockResponse as Response);

    expect(MockedUserModel.findOrCreate).toHaveBeenCalledWith({
      username: DEV_USER.username,
      email: DEV_USER.email,
      name: DEV_USER.name,
      auth_type: 'local',
    });
    expect(responseStatus).not.toHaveBeenCalled();
    const body = (responseJson.mock.calls as unknown[][])[0][0] as { token: string; user: unknown };
    expect(body.user).toEqual({ id: DEV_USER_ID, email: DEV_USER.email, name: DEV_USER.name });

    const decoded = jwt.verify(body.token, process.env.JWT_SECRET!) as { userId: string };
    expect(decoded.userId).toBe(DEV_USER_ID);

    // The issued token passes the auth middleware
    MockedUserModel.findById = jest.fn().mockResolvedValue(devUserRow);
    const req = { headers: { authorization: `Bearer ${body.token}` } } as AuthenticatedRequest;
    const next = jest.fn();
    await authenticateToken(req, mockResponse as Response, next);

    expect(MockedUserModel.findById).toHaveBeenCalledWith(DEV_USER_ID);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: DEV_USER_ID, email: DEV_USER.email, name: DEV_USER.name });
  });
});

describe('authenticateToken', () => {
  it('rejects a token whose userId is not a UUID with 401 instead of 500', async () => {
    const token = jwt.sign({ userId: 'dev-user-123' }, process.env.JWT_SECRET!);
    const responseJson = jest.fn().mockReturnThis();
    const responseStatus = jest.fn().mockReturnThis();
    const res = { json: responseJson, status: responseStatus } as Partial<Response>;
    const next = jest.fn();
    MockedUserModel.findById = jest.fn();

    await authenticateToken(
      { headers: { authorization: `Bearer ${token}` } } as AuthenticatedRequest,
      res as Response,
      next
    );

    expect(responseStatus).toHaveBeenCalledWith(401);
    expect(MockedUserModel.findById).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
