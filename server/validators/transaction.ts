import { body } from 'express-validator';
import { validateRequest } from './auth';

export const transactionValidator = [
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ max: 100 }).withMessage('Description cannot exceed 100 characters'),
  body('amount')
    .isNumeric().withMessage('Amount must be a number')
    .custom((val) => Number(val) >= 0).withMessage('Amount cannot be negative'),
  body('type')
    .isIn(['income', 'expense']).withMessage('Type must be either "income" or "expense"'),
  body('category')
    .trim()
    .notEmpty().withMessage('Category is required'),
  body('date')
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be in YYYY-MM-DD format'),
  body('paymentMethod')
    .trim()
    .notEmpty().withMessage('Payment method is required'),
  validateRequest
];
