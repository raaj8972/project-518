import nodemailer from 'nodemailer';

// Validate environment variables on module load
const validateEnvVars = () => {
  const missing: string[] = [];
  
  if (!process.env.SMTP_USER) missing.push('SMTP_USER');
  if (!process.env.SMTP_PASS) missing.push('SMTP_PASS');
  
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    return { valid: false, missing };
  }
  
  console.log('✅ SMTP environment variables validated');
  return { valid: true, missing: [] };
};

// Validate immediately
const envCheck = validateEnvVars();

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  connectionTimeout: 30000, // 30 seconds
  socketTimeout: 60000, // 60 seconds
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  pool: true, // Use connection pooling
  maxConnections: 5,
  maxMessages: 100,
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

// Helper to format error messages
const formatSMTPError = (error: any): string => {
  const errorMsg = error.message || String(error);
  
  // Common SMTP error patterns
  if (errorMsg.includes('Invalid login') || errorMsg.includes('535')) {
    return 'SMTP authentication failed: Invalid username or password';
  }
  if (errorMsg.includes('ECONNREFUSED')) {
    return 'SMTP connection refused: Cannot reach mail server (check host/port)';
  }
  if (errorMsg.includes('ETIMEDOUT') || errorMsg.includes('timeout')) {
    return 'SMTP connection timeout: Mail server not responding';
  }
  if (errorMsg.includes('ENOTFOUND')) {
    return 'SMTP DNS error: Mail server hostname not found';
  }
  if (errorMsg.includes('ECONNRESET')) {
    return 'SMTP connection reset: Network or firewall issue';
  }
  if (errorMsg.includes('550')) {
    return 'SMTP rejected: Recipient address rejected or mailbox unavailable';
  }
  if (errorMsg.includes('554')) {
    return 'SMTP rejected: Message rejected by server (possibly spam filter)';
  }
  
  return errorMsg;
};

export const sendEmail = async ({ to, subject, html, provider = 'smtp', from, attachments }: EmailOptions) => {
  // Check environment variables first
  if (!envCheck.valid) {
    const errorMsg = `Missing required environment variables: ${envCheck.missing.join(', ')}`;
    console.error('❌ sendEmail failed:', errorMsg);
    return { 
      success: false, 
      error: errorMsg,
      details: { missing: envCheck.missing }
    };
  }

  const sender = from || process.env.EMAIL_SENDER || process.env.SMTP_USER || 'no-reply@ricorrenza.fun';
  
  console.log(`📧 Sending email via [${provider.toUpperCase()}] to: ${to}`);
  console.log(`📝 Subject: ${subject}`);
  if (attachments) {
    console.log(`📎 Attachments: ${attachments.length} file(s)`);
  }

  try {
    if (provider === 'smtp') {
        // Verify transporter configuration (only on first send)
        if (!transporter.transporter) {
          try {
            await transporter.verify();
            console.log('✅ SMTP transporter verified');
          } catch (verifyError: any) {
            const errorMsg = formatSMTPError(verifyError);
            console.error('❌ SMTP verification failed:', errorMsg);
            return { 
              success: false, 
              error: errorMsg,
              details: { 
                originalError: verifyError.message,
                code: verifyError.code 
              }
            };
          }
        }

        // Convert base64 attachments to Buffer for nodemailer
        let nodemailerAttachments;
        try {
          nodemailerAttachments = attachments?.map(att => ({
            filename: att.filename,
            content: Buffer.from(att.content, 'base64')
          }));
        } catch (attachmentError: any) {
          console.error('❌ Attachment processing failed:', attachmentError);
          return {
            success: false,
            error: 'Failed to process email attachments',
            details: { originalError: attachmentError.message }
          };
        }

        const info = await transporter.sendMail({
            from: sender,
            to,
            subject,
            html,
            attachments: nodemailerAttachments
        });
        
        console.log('✅ SMTP Message sent successfully. Message ID:', info.messageId);
        return { success: true, messageId: info.messageId, provider: 'smtp' };
    } 
    else if (provider === 'resend') {
        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) {
          console.error('❌ Missing RESEND_API_KEY');
          return { 
            success: false, 
            error: 'Missing RESEND_API_KEY environment variable' 
          };
        }

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
            const errorMsg = `Resend API error (${res.status}): ${JSON.stringify(errorData)}`;
            console.error('❌ Resend failed:', errorMsg);
            return { 
              success: false, 
              error: errorMsg,
              details: errorData 
            };
        }

        const data = await res.json();
        console.log('✅ Resend email sent successfully. ID:', data.id);
        return { success: true, id: data.id, provider: 'resend' };
    }
    
    const errorMsg = `Invalid email provider: ${provider}`;
    console.error('❌', errorMsg);
    return { success: false, error: errorMsg };
    
  } catch (error: any) {
    const errorMsg = formatSMTPError(error);
    console.error(`❌ Error sending email (${provider}):`, errorMsg);
    console.error('Full error stack:', error.stack || error);
    
    return { 
      success: false, 
      error: errorMsg,
      details: {
        originalError: error.message,
        code: error.code,
        command: error.command,
        stack: error.stack
      }
    };
  }
};
