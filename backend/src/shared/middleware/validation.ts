import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { errorResponse } from '../utils/response';

export function validateRequest(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ');
      errorResponse(res, errorMessage, 400);
      return;
    }

    // Apply validated values (with defaults) back to req.body
    req.body = value;
    next();
  };
}

export function validateQuery(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, { abortEarly: false });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ');
      errorResponse(res, errorMessage, 400);
      return;
    }

    // Apply validated values (with defaults) back to req.query
    req.query = value;
    next();
  };
}

export function validateParams(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, { abortEarly: false });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ');
      errorResponse(res, errorMessage, 400);
      return;
    }

    // Apply validated values (with defaults) back to req.params
    req.params = value;
    next();
  };
}
