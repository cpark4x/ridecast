import Joi from 'joi';

/**
 * Joi validation schemas for compression endpoints
 */

export const compressRequestSchema = Joi.object({
  contentId: Joi.string().uuid().required(),
  ratio: Joi.number().min(0.1).max(0.9).required()
});

export const compressedIdParamSchema = Joi.object({
  compressedId: Joi.string().uuid().required()
});

export const contentIdParamSchema = Joi.object({
  contentId: Joi.string().uuid().required()
});

export const listVersionsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});
