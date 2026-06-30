import { Schema, model } from 'mongoose';

const categorySchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null, // null means global/default system category
  },
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: [true, 'Category type is required'],
  },
  color: {
    type: String,
    default: '#6366f1', // Default indigo accent
  }
}, {
  timestamps: true
});

// Ensure categories are unique per user/type
categorySchema.index({ userId: 1, name: 1, type: 1 }, { unique: true });

import { wrapModel } from './fallbackDb';

const MongooseCategory = model('Category', categorySchema);
export const Category = wrapModel('categories', MongooseCategory) as any;
