import nodemailer from 'nodemailer';

function getTransporter() {
  const googleUser = process.env.GOOGLE_USER;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.REFRESH_TOKEN;

  // Gmail OAuth2 transporter if Google credentials are fully configured
  if (googleUser && clientId && clientSecret && refreshToken) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: googleUser,
        clientId: clientId,
        clientSecret: clientSecret,
        refreshToken: refreshToken
      }
    });
  }

  // Fallback to null (console logger) if not provided
  return null;
}

export const simulatedEmails: Array<{
  to: string;
  subject: string;
  text: string;
  html: string;
  timestamp: Date;
}> = [];

export async function sendEmail({
  to,
  subject,
  text,
  html
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const transporter = getTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.GOOGLE_USER || '"SmartSpend Support" <support@smartspend.io>',
        to,
        subject,
        text,
        html
      });
      console.log(`[Email] Real email sent successfully to ${to}. Subject: "${subject}"`);
      return;
    } catch (error) {
      console.error(`[Email] Failed to send real email to ${to}:`, error);
      console.log(`[Email] Falling back to development simulated sandbox mailbox.`);
    }
  }

  // Log to simulated emails memory store
  simulatedEmails.push({ to, subject, text, html, timestamp: new Date() });
  if (simulatedEmails.length > 50) {
    simulatedEmails.shift();
  }

  // Elegant fallback logging for immediate out-of-the-box feedback
  console.log('\n' + '='.repeat(60));
  console.log(`[EMAIL SIMULATOR] Outbound email to: ${to}`);
  console.log(`[EMAIL SIMULATOR] Subject: ${subject}`);
  console.log('-'.repeat(60));
  console.log(`[EMAIL SIMULATOR] Text Content:\n${text}`);
  console.log('='.repeat(60) + '\n');
}

export async function sendOTPEmail(email: string, otp: string, name: string): Promise<void> {
  const subject = 'Verify your SmartSpend Account - OTP';
  const text = `Hello ${name},\n\nYour OTP for verification is: ${otp}.\nIt expires in 15 minutes.\n\nThank you,\nSmartSpend Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
      <h2 style="color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">SmartSpend Account Verification</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Thank you for signing up with SmartSpend. Please use the following One-Time Password (OTP) to verify your account:</p>
      <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #4f46e5; margin: 20px 0;">
        ${otp}
      </div>
      <p style="font-size: 13px; color: #64748b;">This code will expire in 15 minutes. If you did not request this, you can safely ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 30px;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center;">SmartSpend © 2026. Premium Auditing Partner.</p>
    </div>
  `;

  await sendEmail({ to: email, subject, text, html });
}

export async function sendResetPasswordEmail(email: string, resetLink: string, name: string): Promise<void> {
  const subject = 'Reset your SmartSpend Password';
  const text = `Hello ${name},\n\nYou requested a password reset. Please click this link to reset your password: ${resetLink}\nThis link expires in 1 hour.\n\nThank you,\nSmartSpend Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
      <h2 style="color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Reset Your Password</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>We received a request to reset your password for your SmartSpend account. Click the button below to set a new password:</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p style="font-size: 13px; color: #64748b; word-break: break-all;">Or copy and paste this link into your browser: <br/> ${resetLink}</p>
      <p style="font-size: 13px; color: #64748b;">This link will expire in 1 hour. If you did not make this request, you can safely ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 30px;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center;">SmartSpend © 2026. Premium Auditing Partner.</p>
    </div>
  `;

  await sendEmail({ to: email, subject, text, html });
}
