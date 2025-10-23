import Joi from 'joi';

export const updateProfileSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  email: Joi.string().email().optional()
});

export const addToLibrarySchema = Joi.object({
  contentId: Joi.string().uuid().required()
});

export const updateProgressSchema = Joi.object({
  positionSeconds: Joi.number().integer().min(0).required(),
  durationSeconds: Joi.number().integer().min(0).required(),
  completed: Joi.boolean().optional()
});

export const contentIdParamSchema = Joi.object({
  contentId: Joi.string().uuid().required()
});

export const libraryQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  favorites: Joi.boolean().optional()
});
