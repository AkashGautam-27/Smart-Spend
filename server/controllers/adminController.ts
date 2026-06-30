import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { Budget } from '../models/Budget';
import { Category } from '../models/Category';

// Get list of all users
export async function getUsers(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
}

// Create user directly from admin panel
export async function createUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { name, email, password, role, isVerified, mobile } = req.body;

  try {
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(400).json({ error: 'A user with this email already exists.' });
      return;
    }

    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'user',
      isVerified: isVerified === undefined ? true : isVerified,
      mobile: mobile || ''
    });

    await newUser.save();

    res.status(201).json({
      message: 'User created successfully.',
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isVerified: newUser.isVerified,
        mobile: newUser.mobile,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
}

// Update user details or role
export async function updateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { id } = req.params;
  const { name, email, role, isVerified, mobile } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    // Prevent removing own admin privileges
    if (user._id.toString() === req.userId && role && role !== 'admin') {
      res.status(400).json({ error: 'You cannot revoke your own administrator privileges.' });
      return;
    }

    if (name) user.name = name;
    if (email) {
      const lowerEmail = email.toLowerCase();
      if (lowerEmail !== user.email) {
        const existing = await User.findOne({ email: lowerEmail });
        if (existing) {
          res.status(400).json({ error: 'This email is already in use.' });
          return;
        }
        user.email = lowerEmail;
      }
    }
    if (role) user.role = role;
    if (isVerified !== undefined) user.isVerified = isVerified;
    if (mobile !== undefined) user.mobile = mobile;

    await user.save();

    res.json({
      message: 'User updated successfully.',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        mobile: user.mobile,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
}

// Delete user and cascade delete all their data
export async function deleteUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { id } = req.params;

  try {
    if (id === req.userId) {
      res.status(400).json({ error: 'You cannot delete your own administrative account.' });
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    // Cascade deletion of user transactions, budgets, and categories
    await Transaction.deleteMany({ userId: id });
    await Budget.deleteMany({ userId: id });
    await Category.deleteMany({ userId: id });

    // Finally delete the user
    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'User and all associated data successfully deleted.'
    });
  } catch (error) {
    next(error);
  }
}
