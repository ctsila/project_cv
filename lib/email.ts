import nodemailer from 'nodemailer';

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  if (!process.env.SMTP_HOST) {
    console.warn('SMTP is not configured. Password reset link:', resetUrl);
    return { sent: false, resetUrl };
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@airesume.local',
    to: email,
    subject: 'Reset your AI Resume password',
    text: `Open this link to reset your password: ${resetUrl}`,
    html: `<p>Open this link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
  return { sent: true };
}

export async function sendSignInLinkEmail(email: string, signInUrl: string) {
  if (!process.env.SMTP_HOST) {
    console.warn('SMTP is not configured. Sign-in link:', signInUrl);
    return { sent: false, signInUrl };
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@airesume.local',
    to: email,
    subject: 'Sign in to AI Resume Generator',
    text: `Open this link to sign in: ${signInUrl}`,
    html: `<p>Open this link to sign in:</p><p><a href="${signInUrl}">${signInUrl}</a></p>`,
  });
  return { sent: true };
}
