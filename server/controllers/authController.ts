import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { User } from '../models/User';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendOTPEmail, sendResetPasswordEmail, simulatedEmails } from '../services/email';
import crypto from 'crypto';

// Generate a random 6-digit numeric OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function register(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { name, email, password } = req.body;

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(400).json({ error: 'Account with this email already exists.' });
      return;
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

    const userCount = await User.countDocuments({});
    const role = userCount === 0 ? 'admin' : 'user';

    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password,
      otp,
      otpExpires,
      isVerified: false,
      isOnline: true,
      lastLoginAt: new Date(),
      role
    });

    await newUser.save();

    // Send OTP email (handles fallback/simulator if credentials missing)
    await sendOTPEmail(newUser.email, otp, newUser.name);

    const tokenPayload = { userId: newUser._id.toString(), email: newUser.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Set refresh token in http-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      message: 'Registration successful! Verification OTP sent to your email.',
      token: accessToken,
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        isVerified: newUser.isVerified,
        role: newUser.role
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function login(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // Set online status and update login time
    user.isOnline = true;
    user.lastLoginAt = new Date();
    await user.save();

    const tokenPayload = { userId: user._id.toString(), email: user.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      token: accessToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        role: user.role || 'user'
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (req.userId) {
      const user = await User.findById(req.userId);
      if (user) {
        user.isOnline = false;
        await user.save();
      }
    }
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
}

export async function getMe(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      res.status(404).json({ error: 'User does not exist.' });
      return;
    }

    res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        avatar: user.avatar,
        mobile: user.mobile || '',
        role: user.role || 'user'
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyOtp(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ error: 'User is already verified.' });
      return;
    }

    if (!user.otp || !user.otpExpires || user.otpExpires.getTime() < Date.now()) {
      res.status(400).json({ error: 'OTP has expired or is invalid. Please request a new one.' });
      return;
    }

    if (user.otp !== otp) {
      res.status(400).json({ error: 'Invalid verification OTP.' });
      return;
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Account successfully verified!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: true
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function resendOtp(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: 'Email is required.' });
    return;
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404).json({ error: 'User account not found.' });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ error: 'Account is already verified.' });
      return;
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    await sendOTPEmail(user.email, otp, user.name);

    res.json({ success: true, message: 'A new verification OTP has been sent to your email.' });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Avoid enumerating email states for security, but return success
      res.json({ success: true, message: 'If that email exists in our system, we have sent a reset link.' });
      return;
    }

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.otp = hashedResetToken;
    user.otpExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry
    await user.save();

    const hostUrl = process.env.FRONTEND_URL || req.headers.referer || `${req.protocol}://${req.get('host')}`;
    const resetLink = `${hostUrl}/reset-password?token=${resetToken}&email=${user.email}`;

    await sendResetPasswordEmail(user.email, resetLink, user.name);

    res.json({ success: true, message: 'Password reset link sent to your email.' });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { token, email, password } = req.body;

  if (!token || !email || !password) {
    res.status(400).json({ error: 'Token, email and password are all required.' });
    return;
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    if (user.otp !== hashedToken || !user.otpExpires || user.otpExpires.getTime() < Date.now()) {
      res.status(400).json({ error: 'Reset link has expired or is invalid.' });
      return;
    }

    user.password = password; // pre-save hook hashes it
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password has been updated successfully.' });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const { name, avatar, mobile } = req.body;

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (name) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;
    if (mobile !== undefined) user.mobile = mobile;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        avatar: user.avatar,
        mobile: user.mobile || '',
        role: user.role || 'user'
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.cookies.refreshToken;

  if (!token) {
    res.status(401).json({ error: 'Refresh token is required.' });
    return;
  }

  try {
    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const payload = { userId: user._id.toString(), email: user.email };
    const accessToken = generateAccessToken(payload);

    res.json({ token: accessToken });
  } catch (error) {
    res.status(403).json({ error: 'Session expired. Please log in again.' });
  }
}

export async function getSimulatedEmails(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const userEmail = user.email.toLowerCase();
    const filtered = simulatedEmails.filter(
      email => email.to.toLowerCase() === userEmail
    );
    res.json(filtered);
  } catch (error) {
    next(error);
  }
}
