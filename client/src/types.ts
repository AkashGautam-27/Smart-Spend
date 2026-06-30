export type TransactionType = 'income' | 'expense';

export type PaymentMethod = 'UPI' | 'Cash' | 'Card';

export interface User {
  id: string;
  name: string;
  email: string;
  role?: 'user' | 'admin';
  isVerified?: boolean;
  avatar?: string;
  mobile?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  paymentMethod: PaymentMethod;
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  limit: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

export interface CategoryBudgetStatus {
  category: string;
  limit: number;
  spent: number;
  percentage: number;
  color: string; // 'green' | 'yellow' | 'red'
}

export interface OCRResult {
  amount: number | null;
  date: string | null;
  vendor: string | null;
  category: string | null;
  confidence: number;
}
