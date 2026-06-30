import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Category } from '../models/Category';

// Default built-in categories in case database doesn't have any
const DEFAULT_CATEGORIES = [
  { name: 'Food', type: 'expense', color: '#f59e0b' },
  { name: 'Housing', type: 'expense', color: '#3b82f6' },
  { name: 'Entertainment', type: 'expense', color: '#ec4899' },
  { name: 'Utilities', type: 'expense', color: '#10b981' },
  { name: 'Transportation', type: 'expense', color: '#8b5cf6' },
  { name: 'Shopping', type: 'expense', color: '#ef4444' },
  { name: 'Salary', type: 'income', color: '#10b981' },
  { name: 'Freelance', type: 'income', color: '#06b6d4' },
  { name: 'Investment', type: 'income', color: '#f59e0b' }
];

export async function getCategories(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.userId || null;

  try {
    // Find system categories (userId is null) and user-defined custom categories
    const categories = await Category.find({
      $or: [
        { userId: null },
        ...(userId ? [{ userId }] : [])
      ]
    }).sort({ name: 1 });

    // Seed defaults if empty
    if (categories.length === 0) {
      const seeded = await Category.insertMany(DEFAULT_CATEGORIES);
      res.json(seeded);
      return;
    }

    res.json(categories);
  } catch (error) {
    next(error);
  }
}

export async function createCategory(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const { name, type, color } = req.body;

  if (!name || !type) {
    res.status(400).json({ error: 'Category name and type are required.' });
    return;
  }

  try {
    const existing = await Category.findOne({
      userId: req.userId,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      type
    });

    if (existing) {
      res.status(400).json({ error: 'A category with this name already exists.' });
      return;
    }

    const newCategory = new Category({
      userId: req.userId,
      name: name.trim(),
      type,
      color: color || '#6366f1'
    });

    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const { id } = req.params;
  const { name, color } = req.body;

  try {
    const category = await Category.findOne({ _id: id, userId: req.userId });
    if (!category) {
      res.status(404).json({ error: 'Category not found or unauthorized.' });
      return;
    }

    if (name) category.name = name.trim();
    if (color) category.color = color;

    await category.save();
    res.json(category);
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(
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
    const category = await Category.findOne({ _id: id, userId: req.userId });
    if (!category) {
      res.status(404).json({ error: 'Category not found or unauthorized.' });
      return;
    }

    await category.deleteOne();
    res.json({ success: true, message: 'Category deleted successfully.' });
  } catch (error) {
    next(error);
  }
}
