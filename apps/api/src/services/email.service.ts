import { Resend } from 'resend';
import logger from '../utils/logger';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const EMAIL_FROM = process.env.EMAIL_FROM || 'FresherFlow <no-reply@fresherflow.in>';
const ALERTS_EMAIL_FROM = process.env.ALERTS_EMAIL_FROM || EMAIL_FROM;
const ALERT_EMAILS_ENABLED = process.env.ALERT_EMAILS_ENABLED !== 'false';

/**
 * Minimal Email Service
 * Integrated with Resend for production delivery.
 */
export class EmailService {
    /**
     * Send an OTP code to a user's email
     */
    static async sendOtp(email: string, code: string): Promise<void> {
        const localMessage = `
========================================
Verification Code for FresherFlow: ${code}
To: ${email}
Expires in: 5 minutes
========================================
        `;

        if (process.env.NODE_ENV !== 'production') {
            console.log(localMessage);
            logger.info(`OTP sent to ${email}: ${code}`);
        }

        if (!resend) {
            if (process.env.NODE_ENV === 'production') {
                throw new Error('OTP email service not configured (RESEND_API_KEY missing)');
            }
            return;
        }

        try {
            await resend.emails.send({
                from: EMAIL_FROM,
                to: email,
                subject: `${code} is your FresherFlow verification code`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #333 text-align: center;">FresherFlow Verification</h2>
                        <p style="font-size: 16px; color: #666; text-align: center;">To access your professional feed, please use the verification code below:</p>
                        <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #000;">${code}</span>
                        </div>
                        <p style="font-size: 14px; color: #999; text-align: center;">This code will expire in 5 minutes.</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                        <p style="font-size: 12px; color: #bbb; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
                    </div>
                `
            });
            logger.info(`Email successfully delivered via Resend to ${email}`);
        } catch (error) {
            logger.error(`Failed to send email via Resend to ${email}:`, error);
            if (process.env.NODE_ENV === 'production') {
                throw new Error('Failed to deliver OTP email');
            }
        }
    }

    /**
     * Send a Magic Link to a user's email
     */
    static async sendMagicLink(email: string, link: string): Promise<void> {
        const localMessage = `
========================================
Magic Login Link for FresherFlow:
${link}
To: ${email}
Expires in: 15 minutes
========================================
        `;

        if (process.env.NODE_ENV !== 'production') {
            console.log(localMessage);
            logger.info(`Magic Link sent to ${email}`);
        }

        if (resend) {
            try {
                await resend.emails.send({
                    from: EMAIL_FROM,
                    to: email,
                    subject: `Login to FresherFlow`,
                    html: `
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
                    `
                });
                logger.info(`Magic link email successfully delivered via Resend to ${email}`);
            } catch (error) {
                logger.error(`Failed to send magic link via Resend to ${email}:`, error);
            }
        }
    }

    static async sendOpportunityDigest(
        email: string,
        fullName: string | null | undefined,
        opportunities: Array<{ title: string; company: string; location?: string | null; applyUrl: string }>
    ): Promise<void> {
        if (!ALERT_EMAILS_ENABLED) {
            logger.info(`Alert emails disabled: digest skipped for ${email}`);
            return;
        }
        if (opportunities.length === 0) return;

        const greeting = fullName ? `Hi ${fullName},` : 'Hi,';
        const rows = opportunities
            .slice(0, 8)
            .map((item) => `<li style="margin: 8px 0;"><a href="${item.applyUrl}" style="color:#0b3b8f;text-decoration:none;"><strong>${item.title}</strong></a> at ${item.company}${item.location ? ` (${item.location})` : ''}</li>`)
            .join('');

        if (!resend) {
            logger.info(`Digest email skipped (no Resend): ${email}`, { count: opportunities.length });
            return;
        }

        try {
            await resend.emails.send({
                from: EMAIL_FROM,
                to: email,
                subject: `Your FresherFlow matches (${opportunities.length})`,
                html: `
                    <div style="font-family: sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <p style="font-size: 15px; color: #333;">${greeting}</p>
                        <h2 style="color: #111; margin: 8px 0 12px;">Today's relevant opportunities</h2>
                        <ul style="padding-left: 18px; color: #333;">${rows}</ul>
                        <p style="font-size: 13px; color: #666; margin-top: 16px;">Open FresherFlow to see full details and save opportunities.</p>
                    </div>
                `
            });
        } catch (error) {
            logger.error(`Failed to send digest email to ${email}:`, error);
        }
    }

    static async sendClosingSoonAlert(
        email: string,
        fullName: string | null | undefined,
        payload: { title: string; company: string; expiresText: string; applyUrl: string }
    ): Promise<void> {
        if (!ALERT_EMAILS_ENABLED) {
            logger.info(`Alert emails disabled: closing-soon skipped for ${email}`, { title: payload.title });
            return;
        }
        const greeting = fullName ? `Hi ${fullName},` : 'Hi,';

        if (!resend) {
            logger.info(`Closing-soon email skipped (no Resend): ${email}`, { title: payload.title });
            return;
        }

        try {
            await resend.emails.send({
                from: EMAIL_FROM,
                to: email,
                subject: `Closing soon: ${payload.title}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <p style="font-size: 15px; color: #333;">${greeting}</p>
                        <h2 style="color: #111; margin: 8px 0 12px;">Application closing soon</h2>
                        <p style="font-size: 15px; color: #333; margin: 8px 0;">
                            <strong>${payload.title}</strong> at ${payload.company}
                        </p>
                        <p style="font-size: 14px; color: #aa1f1f; margin: 8px 0 14px;">${payload.expiresText}</p>
                        <a href="${payload.applyUrl}" style="background:#08183d;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none;display:inline-block;">Open listing</a>
                    </div>
                `
            });
        } catch (error) {
            logger.error(`Failed to send closing-soon email to ${email}:`, error);
        }
    }

    /**
     * Send new job alert (instant notification)
     */
    static async sendNewJobAlert(
        email: string,
        fullName: string | null,
        data: { title: string; company: string; location: string | null; applyUrl: string }
    ): Promise<void> {
        if (!ALERT_EMAILS_ENABLED) {
            logger.info(`Alert emails disabled: new-job skipped for ${email}`, { title: data.title });
            return;
        }
        const greeting = fullName ? `Hello ${fullName.split(' ')[0]}` : 'Hello';

        if (!resend) {
            logger.info(`New job alert email skipped (no Resend): ${email}`, { title: data.title });
            return;
        }

        try {
            await resend.emails.send({
                from: ALERTS_EMAIL_FROM,
                to: email,
                subject: `🎯 New Job: ${data.title} at ${data.company}`,
                html: `
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
                `
            });
        } catch (error) {
            logger.error(`Failed to send new job alert to ${email}:`, error);
        }
    }
}
