import { Job } from 'bullmq';
import { logger } from '@fresherflow/logger';
import { Resend } from 'resend';
import { env } from '@fresherflow/config';
import { EmailJobData } from '../index';

const getResendClient = () => env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const getEmailFrom = () => env.EMAIL_FROM || 'FresherFlow <no-reply@localhost>';

export async function processEmailJob(job: Job<EmailJobData>) {
    const { to, subject, html, text } = job.data;
    const resend = getResendClient();
    const EMAIL_FROM = getEmailFrom();

    // Respect email suppression env var
    if (!env.ENABLE_EMAIL_SENDING) {
        logger.info('Email sending is disabled via ENABLE_EMAIL_SENDING. Skipping...', { to, subject });
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
            subject: subject,
            html: html,
            text: text || '',
        });

        if (error) {
            throw new Error(`Resend error: ${error.message}`);
        }

        logger.info('Email sent successfully', { to, subject, messageId: data?.id });
    } catch (error) {
        logger.error('Failed to send email', { to, subject, error: error instanceof Error ? error.message : 'Unknown' });
        throw error;
    }
}
