import nodemailer from 'nodemailer';

const emailUser = process.env['EMAIL_USER'];
const emailPass = process.env['EMAIL_PASS'];
const emailFrom = process.env['EMAIL_FROM'] ?? 'Quetzal TV';

if (!emailUser || !emailPass) {
  throw new Error('EMAIL_USER and EMAIL_PASS environment variables are required');
}

export const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

export async function sendMail(opts: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<void> {
  await transporter.sendMail({
    from: emailFrom,
    to: Array.isArray(opts.to) ? opts.to.join(', ') : opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}
