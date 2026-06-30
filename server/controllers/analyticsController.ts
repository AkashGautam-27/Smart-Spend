import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Transaction } from '../models/Transaction';
import { Budget } from '../models/Budget';
import mongoose from 'mongoose';

export async function getDashboardStats(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    const userIdObj = new mongoose.Types.ObjectId(req.userId);

    // 1. Calculate Total Income, Expense, Net Savings
    const stats = await Transaction.aggregate([
      { $match: { userId: userIdObj } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]);

    let totalIncome = 0;
    let totalExpense = 0;

    stats.forEach(item => {
      if (item._id === 'income') {
        totalIncome = item.total;
      } else if (item._id === 'expense') {
        totalExpense = item.total;
      }
    });

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    // 2. Category Expense Breakdown
    const expenseBreakdown = await Transaction.aggregate([
      { $match: { userId: userIdObj, type: 'expense' } },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // 3. Budgets Tracking (Current month spending vs budget limit)
    const currentYearMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    
    // Spend per category in current month
    const currentMonthSpend = await Transaction.aggregate([
      {
        $match: {
          userId: userIdObj,
          type: 'expense',
          date: { $regex: new RegExp(`^${currentYearMonth}`) }
        }
      },
      {
        $group: {
          _id: '$category',
          spend: { $sum: '$amount' }
        }
      }
    ]);

    const budgets = await Budget.find({ userId: req.userId });
    
    const budgetStatus = budgets.map((b: any) => {
      const spendItem = currentMonthSpend.find(s => s._id === b.category);
      const spend = spendItem ? spendItem.spend : 0;
      return {
        id: b._id,
        category: b.category,
        limit: b.limit,
        spent: spend,
        isOverBudget: spend > b.limit,
        percentageUsed: b.limit > 0 ? (spend / b.limit) * 100 : 0
      };
    });

    // 4. Recent Transactions
    const recentTransactions = await Transaction.find({ userId: req.userId })
      .sort({ date: -1, createdAt: -1 })
      .limit(5);

    res.json({
      summary: {
        totalIncome,
        totalExpense,
        netSavings,
        savingsRate: Math.round(savingsRate * 100) / 100
      },
      expenseBreakdown: expenseBreakdown.map(item => ({
        category: item._id,
        value: item.totalAmount
      })),
      budgetStatus,
      recentTransactions
    });
  } catch (error) {
    next(error);
  }
}

export async function getMonthlyReports(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    const userIdObj = new mongoose.Types.ObjectId(req.userId);

    // Group transactions by year-month and type
    const monthlyData = await Transaction.aggregate([
      { $match: { userId: userIdObj } },
      {
        $project: {
          yearMonth: { $substr: ['$date', 0, 7] }, // Extract 'YYYY-MM' from string date
          amount: 1,
          type: 1
        }
      },
      {
        $group: {
          _id: {
            month: '$yearMonth',
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.month': 1 } }
    ]);

    // Reshape data to be client-friendly, e.g. [{ month: '2026-06', income: 5000, expense: 3200, savings: 1800 }]
    const formattedReport: { [key: string]: any } = {};

    monthlyData.forEach(item => {
      const m = item._id.month;
      const t = item._id.type;

      if (!formattedReport[m]) {
        formattedReport[m] = { month: m, income: 0, expense: 0, savings: 0 };
      }

      if (t === 'income') {
        formattedReport[m].income = item.total;
      } else if (t === 'expense') {
        formattedReport[m].expense = item.total;
      }

      formattedReport[m].savings = formattedReport[m].income - formattedReport[m].expense;
    });

    // Convert object to sorted array of reports
    const sortedReports = Object.values(formattedReport).sort((a: any, b: any) => 
      a.month.localeCompare(b.month)
    );

    res.json(sortedReports);
  } catch (error) {
    next(error);
  }
}
