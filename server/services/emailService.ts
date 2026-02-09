import nodemailer from "nodemailer";
import { logger } from "../logger";

/**
 * Email Service for sending OTP and transactional emails
 */
class EmailService {
    private transporter: nodemailer.Transporter | null = null;

    constructor() {
        this.initializeTransporter();
    }

    private initializeTransporter() {
        const emailConfig = {
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port: parseInt(process.env.SMTP_PORT || "587"),
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        };

        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            logger.warn("⚠️  SMTP credentials not configured - Email service disabled");
            return;
        }

        this.transporter = nodemailer.createTransport(emailConfig);
        logger.info("📧 EmailService: SMTP Transporter initialized");
    }

    /**
     * Send OTP email for verification
     */
    async sendOTP(email: string, otp: string, type: "registration" | "password-reset" = "registration") {
        if (!this.transporter) {
            logger.warn(`Email not sent to ${email} - SMTP not configured`);
            return { success: false, message: "Email service not configured" };
        }

        try {
            const subject = type === "registration"
                ? "Verify Your Email - Steal the Deal Seller Registration"
                : "Reset Your Password - Steal the Deal";

            const html = this.getOTPEmailTemplate(otp, type);

            await this.transporter.sendMail({
                from: `"Steal the Deal" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                to: email,
                subject,
                html,
            });

            logger.info(`✅ OTP email sent to ${email}`);
            return { success: true, message: "OTP sent successfully" };
        } catch (error) {
            logger.error(`❌ Failed to send OTP email to ${email}:`, error);
            return { success: false, message: "Failed to send OTP email" };
        }
    }

    /**
     * Send seller approval notification
     */
    async sendSellerApprovalEmail(email: string, shopName: string) {
        if (!this.transporter) return { success: false };

        try {
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🎉 Congratulations!</h1>
                        </div>
                        <div class="content">
                            <h2>Your Seller Account Has Been Approved!</h2>
                            <p>Dear ${shopName},</p>
                            <p>We're excited to inform you that your seller account has been approved! You can now start listing your products and reaching millions of customers on Steal the Deal.</p>
                            
                            <p><strong>Next Steps:</strong></p>
                            <ul>
                                <li>Complete your shop profile</li>
                                <li>Add your first products</li>
                                <li>Set up your bank details for payouts</li>
                                <li>Start selling!</li>
                            </ul>

                            <div style="text-align: center;">
                                <a href="${process.env.CLIENT_URL || 'http://localhost:5000'}/seller/dashboard" class="button">
                                    Go to Seller Dashboard
                                </a>
                            </div>

                            <p>If you have any questions, feel free to reach out to our support team.</p>
                            <p>Happy selling!</p>
                        </div>
                        <div class="footer">
                            <p>&copy; 2026 Steal the Deal. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            await this.transporter.sendMail({
                from: `"Steal the Deal" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                to: email,
                subject: "🎉 Your Seller Account Has Been Approved!",
                html,
            });

            logger.info(`✅ Approval email sent to ${email}`);
            return { success: true };
        } catch (error) {
            logger.error(`❌ Failed to send approval email:`, error);
            return { success: false };
        }
    }

    /**
     * Send seller rejection notification
     */
    async sendSellerRejectionEmail(email: string, shopName: string, reason?: string) {
        if (!this.transporter) return { success: false };

        try {
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .reason { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Application Update</h1>
                        </div>
                        <div class="content">
                            <h2>Seller Application Status</h2>
                            <p>Dear ${shopName},</p>
                            <p>Thank you for your interest in becoming a seller on Steal the Deal.</p>
                            <p>After reviewing your application, we regret to inform you that we are unable to approve your seller account at this time.</p>
                            
                            ${reason ? `
                                <div class="reason">
                                    <strong>Reason:</strong><br>
                                    ${reason}
                                </div>
                            ` : ''}

                            <p>You may reapply after addressing the issues mentioned above or contact our support team for more information.</p>
                            <p>We appreciate your interest and hope to work with you in the future.</p>
                        </div>
                        <div class="footer">
                            <p>&copy; 2026 Steal the Deal. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            await this.transporter.sendMail({
                from: `"Steal the Deal" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                to: email,
                subject: "Seller Application Update",
                html,
            });

            logger.info(`✅ Rejection email sent to ${email}`);
            return { success: true };
        } catch (error) {
            logger.error(`❌ Failed to send rejection email:`, error);
            return { success: false };
        }
    }

    /**
     * Get OTP email template
     */
    private getOTPEmailTemplate(otp: string, type: "registration" | "password-reset"): string {
        const title = type === "registration" ? "Verify Your Email" : "Reset Your Password";
        const message = type === "registration"
            ? "Thank you for registering as a seller on Steal the Deal. Please use the code below to verify your email address:"
            : "You requested to reset your password. Use the code below to proceed:";

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; }
                    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
                    .content { padding: 40px 30px; }
                    .otp-box { background: #f0f0f0; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
                    .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: monospace; }
                    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; font-size: 14px; }
                    .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>${title}</h1>
                    </div>
                    <div class="content">
                        <p>${message}</p>
                        
                        <div class="otp-box">
                            <p style="margin: 0; font-size: 14px; color: #666;">Your verification code</p>
                            <div class="otp-code">${otp}</div>
                            <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">Valid for 10 minutes</p>
                        </div>

                        <div class="warning">
                            <strong>⚠️ Security Notice:</strong><br>
                            Never share this code with anyone. Our team will never ask for your verification code.
                        </div>

                        <p>If you didn't request this code, please ignore this email or contact our support team if you have concerns.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2026 Steal the Deal. All rights reserved.</p>
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    /**
     * Send email notification when support ticket receives a reply
     */
    async sendTicketReplyEmail(
        email: string,
        ticketId: string,
        subject: string,
        messagePreview: string,
        senderType: "agent" | "admin"
    ) {
        if (!this.transporter) {
            logger.warn(`Email not sent to ${email} - SMTP not configured`);
            return { success: false, message: "Email service not configured" };
        }

        const senderLabel = senderType === "admin" ? "Support Admin" : "Support Agent";

        try {
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .message-box { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; }
                        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>📨 New Reply to Your Ticket</h1>
                        </div>
                        <div class="content">
                            <p>Hi,</p>
                            <p>Your support ticket <strong>${ticketId}</strong> has received a reply from our ${senderLabel}.</p>
                            
                            <p><strong>Ticket Subject:</strong> ${subject}</p>
                            
                            <div class="message-box">
                                <strong>Message Preview:</strong><br>
                                ${messagePreview.substring(0, 200)}${messagePreview.length > 200 ? '...' : ''}
                            </div>

                            <div style="text-align: center;">
                                <a href="${process.env.CLIENT_URL || 'http://localhost:5000'}/support/tickets/${ticketId}" class="button">
                                    View Full Conversation
                                </a>
                            </div>

                            <p>Thank you for contacting our support team!</p>
                        </div>
                        <div class="footer">
                            <p>&copy; 2026 Steal the Deal. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            await this.transporter.sendMail({
                from: `"Steal the Deal Support" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                to: email,
                subject: `Re: ${subject} [${ticketId}]`,
                html,
            });

            logger.info(`✅ Ticket reply email sent to ${email} for ${ticketId}`);
            return { success: true };
        } catch (error) {
            logger.error(`❌ Failed to send ticket reply email to ${email}:`, error);
            return { success: false };
        }
    }
}

export const emailService = new EmailService();
