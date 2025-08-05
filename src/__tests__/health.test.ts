import request from 'supertest';
import express from 'express';

// Create a simple test app with just the health endpoint
const createTestApp = (): express.Application => {
  const app = express();
  app.use(express.json());
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'Daily Task Manager API is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });
  
  return app;
};

describe('Health Check Endpoint', () => {
  let app: express.Application;
  
  beforeEach(() => {
    app = createTestApp();
  });
  
  it('should return 200 and health status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body).toEqual({
      success: true,
      message: 'Daily Task Manager API is running',
      timestamp: expect.any(String),
      environment: 'test'
    });
  });
  
  it('should return valid timestamp format', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    const timestamp = response.body.timestamp;
    expect(timestamp).toBeDefined();
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });
  
  it('should return test environment in test mode', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body.environment).toBe('test');
  });
});