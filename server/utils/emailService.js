const nodemailer = require('nodemailer');

function buildTransport() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

async function sendOTP(email, code, purpose = 'otp') {
  const transporter = buildTransport();
  const subject =
    purpose === 'reset'
      ? 'Your Deadman-Link password reset code'
      : 'Your Deadman-Link verification code';
  const text = `Your code is ${code}. It expires in 10 minutes.`;

  if (!transporter) {
    console.log(`[OTP] ${purpose} for ${email}: ${code} (email not configured)`);
    return { mode: 'console' };
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      text,
    });
    return { mode: 'email' };
  } catch (err) {
    console.error('Failed to send email OTP, falling back to console:', err);
    console.log(`[OTP] ${purpose} for ${email}: ${code}`);
    return { mode: 'console' };
  }
}

module.exports = { sendOTP };
