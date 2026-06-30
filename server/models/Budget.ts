import { Schema, model } from 'mongoose';

const budgetSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
  },
  limit: {
    type: Number,
    required: [true, 'Limit is required'],
    min: [0, 'Limit cannot be negative'],
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

// Ensure a user can only have one budget per category
budgetSchema.index({ userId: 1, category: 1 }, { unique: true });

import { wrapModel } from './fallbackDb';

const MongooseBudget = model('Budget', budgetSchema);
export const Budget = wrapModel('budgets', MongooseBudget) as any;
