import { Request, Response, NextFunction } from 'express';

export const validateCreateTask = (req: Request, res: Response, next: NextFunction): void => {
  const { title, priority, due_date } = req.body;

  // Validate title
  if (!title || typeof title !== 'string' || title.trim() === '') {
    res.status(400).json({
      success: false,
      message: 'Title is required and must be a non-empty string'
    });
    return;
  }

  // Validate priority if provided
  if (priority && !['low', 'medium', 'high'].includes(priority)) {
    res.status(400).json({
      success: false,
      message: 'Priority must be one of: low, medium, high'
    });
    return;
  }

  // Validate due_date if provided
  if (due_date && isNaN(Date.parse(due_date))) {
    res.status(400).json({
      success: false,
      message: 'Invalid due_date format'
    });
    return;
  }

  next();
};

export const validateUpdateTask = (req: Request, res: Response, next: NextFunction): void => {
  const { title, priority, due_date, completed } = req.body;

  // Validate title if provided
  if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
    res.status(400).json({
      success: false,
      message: 'Title must be a non-empty string'
    });
    return;
  }

  // Validate priority if provided
  if (priority && !['low', 'medium', 'high'].includes(priority)) {
    res.status(400).json({
      success: false,
      message: 'Priority must be one of: low, medium, high'
    });
    return;
  }

  // Validate due_date if provided
  if (due_date && isNaN(Date.parse(due_date))) {
    res.status(400).json({
      success: false,
      message: 'Invalid due_date format'
    });
    return;
  }

  // Validate completed if provided
  if (completed !== undefined && typeof completed !== 'boolean') {
    res.status(400).json({
      success: false,
      message: 'Completed must be a boolean'
    });
    return;
  }

  next();
};

export const validateTaskId = (req: Request, res: Response, next: NextFunction): void => {
  const { id } = req.params;
  
  // Basic UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid task ID format'
    });
    return;
  }

  next();
};