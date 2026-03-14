import { Job } from 'bullmq';
import { logger } from '@fresherflow/logger';
import { Resend } from 'resend';
import { EmailJobData } from '@fresherflow/queue';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM || 'FresherFlow <no-reply@fresherflow.in>';

export async function processEmailJob(job: Job<EmailJobData>) {
    const { to, subject, html, text } = job.data;

    if (process.env.ENABLE_EMAIL_SENDING === 'false') {
        logger.info('Email sending disabled via ENABLE_EMAIL_SENDING. Skipping...', { to, subject });
        return;
    }

    if (!resend) {
        logger.warn('RESEND_API_KEY not found. Skipping email sending.', { to, subject });
        return;
    }

    try {
        const { data, error } = await resend.emails.send({
            from: EMAIL_FROM,
            to: [to],
            subject,
            html,
            text: text || '',
        });

        if (error) throw new Error(`Resend error: ${error.message}`);
        logger.info('Email sent successfully', { to, subject, messageId: data?.id });
    } catch (error) {
        logger.error('Failed to send email', { to, subject, error: error instanceof Error ? error.message : 'Unknown' });
        throw error;
    }
}
