import Joi from 'joi';

export const convertAudioSchema = Joi.object({
  contentId: Joi.string().uuid().required(),
  voiceId: Joi.string().required(),
  config: Joi.object({
    speed: Joi.number().min(0.5).max(2.0).default(1.0),
    pitch: Joi.number().min(-50).max(50).default(0)
  }).default({ speed: 1.0, pitch: 0 }),
  isCompressed: Joi.boolean().default(false)
});

export const jobIdParamSchema = Joi.object({
  jobId: Joi.string().uuid().required()
});
