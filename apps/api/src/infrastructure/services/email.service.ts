import { logger } from '@fresherflow/logger';
import { env } from '@fresherflow/config';
import { enqueueEmail } from '@fresherflow/queue';

/**
 * Minimal Email Service
 * Now refactored to use BullMQ for background processing.
 */
export class EmailService {
    /**
     * Helper to push to queue
     */
    private static async pushToQueue(to: string, subject: string, html: string): Promise<void> {
        if (!env.ENABLE_EMAIL_SENDING) {
            logger.info(`[SUPPRESSED] Email sending is disabled via ENABLE_EMAIL_SENDING. Skipping queue for ${to}: ${subject}`);
            return;
        }

        if (process.env.NODE_ENV !== 'production') {
            logger.info(`[DEV] Email queued for ${to}: ${subject}`);
        }

        try {
            await enqueueEmail({ to, subject, html });
            logger.debug(`Email job added to queue for ${to}`);
        } catch (error) {
            logger.error(`Failed to add email job to queue for ${to}:`, error);
            // In production, we might want to throw if the queue is critical
            if (process.env.NODE_ENV === 'production') {
                throw new Error('Failed to queue email notification');
            }
        }
    }

    /**
     * Send an OTP code to a user's email
     */
    static async sendOtp(email: string, code: string): Promise<void> {
        if (process.env.NODE_ENV !== 'production') {
            console.log('\n' + '='.repeat(40));
            console.log(`🔑 DEV OTP for ${email}: ${code}`);
            console.log('='.repeat(40) + '\n');
        }

        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #333; text-align: center;">FresherFlow Verification</h2>
                <p style="font-size: 16px; color: #666; text-align: center;">To access your professional feed, please use the verification code below:</p>
                <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #000;">${code}</span>
                </div>
                <p style="font-size: 14px; color: #999; text-align: center;">This code will expire in 5 minutes.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #bbb; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
            </div>
        `;

        await this.pushToQueue(email, `${code} is your FresherFlow verification code`, html);
    }

    /**
     * Send a Magic Link to a user's email
     */
    static async sendMagicLink(email: string, link: string): Promise<void> {
        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #333; text-align: center;">Login to FresherFlow</h2>
                <p style="font-size: 16px; color: #666; text-align: center;">Click the button below to log into your account. This link will expire in 15 minutes.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${link}" style="background: #000; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Login to Dashboard</a>
                </div>
                <p style="font-size: 12px; color: #999; text-align: center;">If the button above doesn't work, copy and paste this link into your browser:</p>
                <p style="font-size: 12px; color: #007bff; text-align: center; word-break: break-all;">${link}</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #bbb; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
            </div>
        `;

        await this.pushToQueue(email, `Login to FresherFlow`, html);
    }

    static async sendOpportunityDigest(
        email: string,
        fullName: string | null | undefined,
        opportunities: Array<{ title: string; company: string; location?: string | null; applyUrl: string }>
    ): Promise<void> {
        if (opportunities.length === 0) return;

        const greeting = fullName ? `Hi ${fullName},` : 'Hi,';
        const rows = opportunities
            .slice(0, 8)
            .map((item) => `<li style="margin: 8px 0;"><a href="${item.applyUrl}" style="color:#0b3b8f;text-decoration:none;"><strong>${item.title}</strong></a> at ${item.company}${item.location ? ` (${item.location})` : ''}</li>`)
            .join('');

        const html = `
            <div style="font-family: sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <p style="font-size: 15px; color: #333;">${greeting}</p>
                <h2 style="color: #111; margin: 8px 0 12px;">Today's relevant opportunities</h2>
                <ul style="padding-left: 18px; color: #333;">${rows}</ul>
                <p style="font-size: 13px; color: #666; margin-top: 16px;">Open FresherFlow to see full details and save opportunities.</p>
            </div>
        `;

        await this.pushToQueue(email, `Your FresherFlow matches (${opportunities.length})`, html);
    }

    static async sendClosingSoonAlert(
        email: string,
        fullName: string | null | undefined,
        payload: { title: string; company: string; expiresText: string; applyUrl: string }
    ): Promise<void> {
        const greeting = fullName ? `Hi ${fullName},` : 'Hi,';

        const html = `
            <div style="font-family: sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <p style="font-size: 15px; color: #333;">${greeting}</p>
                <h2 style="color: #111; margin: 8px 0 12px;">Application closing soon</h2>
                <p style="font-size: 15px; color: #333; margin: 8px 0;">
                    <strong>${payload.title}</strong> at ${payload.company}
                </p>
                <p style="font-size: 14px; color: #aa1f1f; margin: 8px 0 14px;">${payload.expiresText}</p>
                <a href="${payload.applyUrl}" style="background:#08183d;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none;display:inline-block;">Open listing</a>
            </div>
        `;

        await this.pushToQueue(email, `Closing soon: ${payload.title}`, html);
    }

    /**
     * Send new job alert (instant notification)
     */
    static async sendNewJobAlert(
        email: string,
        fullName: string | null,
        data: { title: string; company: string; location: string | null; applyUrl: string }
    ): Promise<void> {
        const greeting = fullName ? `Hello ${fullName.split(' ')[0]}` : 'Hello';

        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #333; text-align: center;">🎯 New Job Alert</h2>
                <p style="font-size: 16px; color: #666; text-align: center;">${greeting},</p>
                <p style="font-size: 16px; color: #666; text-align: center;">A new opportunity matching your profile has just been posted!</p>
                <div style="background: #f4f4f4; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #000;">${data.title}</h3>
                    <p style="color: #666; margin: 5px 0;"><strong>Company:</strong> ${data.company}</p>
                    <p style="color: #666; margin: 5px 0;"><strong>Location:</strong> ${data.location || 'Multiple locations'}</p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${data.applyUrl}" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold;">View & Apply</a>
                </div>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #bbb; text-align: center;">You're receiving this because you enabled instant job alerts in your preferences.</p>
            </div>
        `;

        await this.pushToQueue(email, `🎯 New Job: ${data.title} at ${data.company}`, html);
    }
}
