import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Transaction } from '../models/Transaction';

export async function getTransactions(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const {
    type,
    category,
    search,
    startDate,
    endDate,
    page = 1,
    limit = 1000, // Large default to replicate client list or support custom pagination
    sortBy = 'date',
    sortOrder = 'desc'
  } = req.query;

  try {
    const query: any = { userId: req.userId };

    if (type) {
      query.type = type;
    }

    if (category) {
      query.category = category;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = startDate;
      }
      if (endDate) {
        query.date.$lte = endDate;
      }
    }

    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { paymentMethod: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const sortField = String(sortBy);
    const sortDir = sortOrder === 'asc' ? 1 : -1;
    const sortObj: any = {};
    sortObj[sortField] = sortDir;
    // Secondary tie-breaker sort
    if (sortField !== 'createdAt') {
      sortObj.createdAt = -1;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skipNum = (pageNum - 1) * limitNum;

    const totalCount = await Transaction.countDocuments(query);
    const list = await Transaction.find(query)
      .sort(sortObj)
      .skip(skipNum)
      .limit(limitNum);

    // Return format matching frontend structure, with optional pagination metadata if paginated parameter is set
    if (req.query.paginated === 'true') {
      res.json({
        transactions: list,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(totalCount / limitNum)
        }
      });
    } else {
      res.json(list);
    }
  } catch (error) {
    next(error);
  }
}

// Keeping compatibility with standard response for old API: app.get('/api/transactions') returns exact list of txs directly.
// Let's create a simpler handler for that directly, or let getTransactions support it if query has no page/limit!
export async function getTransactionsDirectList(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    const list = await Transaction.find({ userId: req.userId }).sort({ date: -1, createdAt: -1 });
    res.json(list);
  } catch (error) {
    next(error);
  }
}

export async function createTransaction(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const { description, amount, type, category, date, paymentMethod } = req.body;

  try {
    const newTx = new Transaction({
      userId: req.userId,
      description,
      amount: Number(amount),
      type,
      category,
      date,
      paymentMethod
    });

    await newTx.save();
    res.status(201).json(newTx);
  } catch (error) {
    next(error);
  }
}

export async function updateTransaction(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const { id } = req.params;
  const { description, amount, type, category, date, paymentMethod } = req.body;

  try {
    const tx = await Transaction.findOne({ _id: id, userId: req.userId });
    if (!tx) {
      res.status(404).json({ error: 'Transaction not found.' });
      return;
    }

    if (description !== undefined) tx.description = description;
    if (amount !== undefined) tx.amount = Number(amount);
    if (type !== undefined) tx.type = type;
    if (category !== undefined) tx.category = category;
    if (date !== undefined) tx.date = date;
    if (paymentMethod !== undefined) tx.paymentMethod = paymentMethod;

    await tx.save();
    res.json(tx);
  } catch (error) {
    next(error);
  }
}

export async function deleteTransaction(
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
    const tx = await Transaction.findOne({ _id: id, userId: req.userId });
    if (!tx) {
      res.status(404).json({ error: 'Transaction not found or unauthorized.' });
      return;
    }

    await tx.deleteOne();
    res.json({ success: true, deleted: tx });
  } catch (error) {
    next(error);
  }
}
