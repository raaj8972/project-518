import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

type EmailOptions = {
    to: string | string[];
    subject: string;
    html: string;
    provider?: 'smtp' | 'resend';
    from?: string; // Optional override
    attachments?: Array<{
        filename: string;
        content: string; // base64 string
    }>;
};

export const sendEmail = async ({ to, subject, html, provider = 'smtp', from, attachments }: EmailOptions) => {
  const sender = from || process.env.EMAIL_SENDER || process.env.SMTP_USER || 'no-reply@ricorrenza.fun';
  
  console.log(`Sending email via [${provider.toUpperCase()}] to: ${to}`);

  try {
    if (provider === 'smtp') {
        // Convert base64 attachments to Buffer for nodemailer
        const nodemailerAttachments = attachments?.map(att => ({
            filename: att.filename,
            content: Buffer.from(att.content, 'base64')
        }));

        const info = await transporter.sendMail({
            from: sender,
            to,
            subject,
            html,
            attachments: nodemailerAttachments
        });
        console.log('SMTP Message sent: %s', info.messageId);
        return { success: true, messageId: info.messageId, provider: 'smtp' };
    } 
    else if (provider === 'resend') {
        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) throw new Error('Missing RESEND_API_KEY');

        // Resend accepts attachments with base64 content
        const resendAttachments = attachments?.map(att => ({
            filename: att.filename,
            content: att.content
        }));

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
                from: sender,
                to: Array.isArray(to) ? to : [to],
                subject,
                html,
                attachments: resendAttachments
            }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(JSON.stringify(errorData));
        }

        const data = await res.json();
        return { success: true, id: data.id, provider: 'resend' };
    }
    
    throw new Error('Invalid provider');
  } catch (error) {
    console.error(`Error sending email (${provider}):`, error);
    return { success: false, error };
  }
};
