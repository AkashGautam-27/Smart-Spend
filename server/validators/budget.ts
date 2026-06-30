import { body } from 'express-validator';
import { validateRequest } from './auth';

export const budgetValidator = [
  body('category')
    .trim()
    .notEmpty().withMessage('Category is required'),
  body('limit')
    .isNumeric().withMessage('Limit must be a number')
    .custom((val) => Number(val) >= 0).withMessage('Limit cannot be negative'),
  validateRequest
];
