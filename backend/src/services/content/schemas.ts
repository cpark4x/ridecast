import Joi from 'joi';

export const uploadContentSchema = Joi.object({
  title: Joi.string().max(500).optional(),
  author: Joi.string().max(255).optional(),
  type: Joi.string()
    .valid('book', 'article', 'pdf', 'epub', 'txt', 'other')
    .optional()
});

export const getContentQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  type: Joi.string().valid('book', 'article', 'pdf', 'epub', 'txt', 'other').optional()
});

export const contentIdParamSchema = Joi.object({
  id: Joi.string().uuid().required()
});
