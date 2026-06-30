import { Schema, model } from 'mongoose';

const transactionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative'],
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: [true, 'Type is required'],
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
  },
  date: {
    type: String, // Stored as 'YYYY-MM-DD' to prevent timezone conversion mismatches
    required: [true, 'Date is required'],
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    trim: true,
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret: any) => {
      ret.id = ret._id ? ret._id.toString() : ret.id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: (doc, ret: any) => {
      ret.id = ret._id ? ret._id.toString() : ret.id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Create compound index for fast queries
transactionSchema.index({ userId: 1, date: -1 });

import { wrapModel } from './fallbackDb';

const MongooseTransaction = model('Transaction', transactionSchema);
export const Transaction = wrapModel('transactions', MongooseTransaction) as any;
