import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Budget } from '../models/Budget';

export async function getBudgets(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    const list = await Budget.find({ userId: req.userId });
    res.json(list);
  } catch (error) {
    next(error);
  }
}

export async function setBudget(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const { category, limit } = req.body;

  try {
    // Find existing budget
    let budget = await Budget.findOne({ userId: req.userId, category });

    if (budget) {
      budget.limit = Number(limit);
      await budget.save();
      res.json(budget);
    } else {
      budget = new Budget({
        userId: req.userId,
        category,
        limit: Number(limit)
      });
      await budget.save();
      res.status(201).json(budget);
    }
  } catch (error) {
    next(error);
  }
}

export async function deleteBudget(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const { id } = req.params;

  try {
    const budget = await Budget.findOne({ _id: id, userId: req.userId });
    if (!budget) {
      res.status(404).json({ error: 'Budget not found.' });
      return;
    }

    await budget.deleteOne();
    res.json({ success: true, message: 'Budget removed successfully.' });
  } catch (error) {
    next(error);
  }
}
