import nodemailer from 'nodemailer'

// Create transporter — uses Gmail SMTP
// For Gmail: enable 2FA and generate an App Password at https://myaccount.google.com/apppasswords
export function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })
}

export async function sendMail(to: string | string[], subject: string, html: string) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS ||
      process.env.EMAIL_USER === 'your_gmail@gmail.com') {
    console.warn('[mailer] EMAIL_USER/EMAIL_PASS not configured — skipping email send')
    return { skipped: true }
  }

  const transporter = createTransporter()
  const recipients = Array.isArray(to) ? to.join(',') : to

  const info = await transporter.sendMail({
    from: `"StudentFlow School" <${process.env.EMAIL_USER}>`,
    to: recipients,
    subject,
    html,
  })

  return { messageId: info.messageId }
}

// HTML email template
export function buildEmailHtml(title: string, body: string, footer = 'StudentFlow School Management System') {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 32px 24px">
      <div style="font-size:22px;font-weight:700;color:#fff">🎓 StudentFlow</div>
      <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:4px">School Management System</div>
    </div>
    <div style="padding:32px">
      <h2 style="margin:0 0 16px;font-size:20px;color:#1e293b">${title}</h2>
      <div style="font-size:15px;color:#475569;line-height:1.7">${body}</div>
    </div>
    <div style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0">
      <div style="font-size:12px;color:#94a3b8">${footer}</div>
      <div style="font-size:11px;color:#cbd5e1;margin-top:4px">This is an automated message. Please do not reply directly.</div>
    </div>
  </div>
</body>
</html>`
}
