import { logger } from "../logger";
import nodemailer from "nodemailer";

interface EmailUser {
    email: string;
    name?: string;
}

interface OrderDetails {
    id: number;
    totalAmount: string;
    items: any[];
}

class EmailService {
    private transporter: nodemailer.Transporter | null = null;

    constructor() {
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || "587"),
                secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
            logger.info("📧 EmailService: SMTP Transporter initialized");
        } else {
            logger.warn("⚠️ EmailService: SMTP configuration missing. Using MOCK mode.");
        }
    }

    async sendEmail(to: string, subject: string, html: string) {
        if (!this.transporter) {
            // MOCK: Log to console in development
            const divider = "=".repeat(50);
            logger.info(`\n${divider}`);
            logger.info(`📧 MOCK EMAIL SENT (Configure SMTP in .env to send real emails)`);
            logger.info(`To: ${to}`);
            logger.info(`Subject: ${subject}`);
            logger.info(`Body Preview: ${html.substring(0, 100)}...`);
            logger.info(`${divider}\n`);
            return true;
        }

        try {
            const info = await this.transporter.sendMail({
                from: process.env.SMTP_FROM || '"Steal the Deal" <no-reply@example.com>',
                to,
                subject,
                html,
            });
            logger.info(`📧 Email sent: ${info.messageId}`);
            return true;
        } catch (error) {
            logger.error("❌ Failed to send email:", error);
            // Don't crash the app, but log the error
            return false;
        }
    }

    async sendWelcomeEmail(user: EmailUser) {
        const subject = "Welcome to Steal the Deal!";
        const html = `
      <h1>Welcome ${user.name || 'User'}!</h1>
      <p>Thanks for joining Steal the Deal. We're excited to have you.</p>
    `;
        return this.sendEmail(user.email, subject, html);
    }

    async sendOrderConfirmation(user: EmailUser, order: OrderDetails) {
        const subject = `Order Confirmation #${order.id}`;
        const html = `
      <h1>Thanks for your order!</h1>
      <p>Order ID: ${order.id}</p>
      <p>Total: ₹${order.totalAmount}</p>
      <p>We'll notify you when it ships.</p>
    `;
        return this.sendEmail(user.email, subject, html);
    }

    async sendPasswordReset(user: EmailUser, token: string) {
        const subject = "Reset Your Password";
        const baseUrl = process.env.BASE_URL || "http://localhost:5000";
        // Frontend route for reset
        const resetLink = `${baseUrl}/auth/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;
        const html = `
      <h1>Password Reset Request</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>This link will expire in 15 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;
        return this.sendEmail(user.email, subject, html);
    }
    async sendVerificationEmail(email: string, otp: string) {
        const subject = "Verify your email - Steal the Deal";
        const html = `
      <h1>Email Verification</h1>
      <p>Your verification code is:</p>
      <h2 style="font-size: 24px; color: #E89F71; letter-spacing: 2px;">${otp}</h2>
      <p>This code will expire in 10 minutes.</p>
    `;
        return this.sendEmail(email, subject, html);
    }

    async sendStockNotification(email: string, productName: string, productUrl: string) {
        const subject = `Good news! ${productName} is back in stock`;
        const html = `
      <h1>🎉 Your Item is Back!</h1>
      <p>Great news! The product you were waiting for is now available:</p>
      <h2 style="color: #E89F71;">${productName}</h2>
      <p>Click below to grab it before it's gone again:</p>
      <a href="${productUrl}" style="display: inline-block; background: #E89F71; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
        Shop Now
      </a>
      <p style="margin-top: 20px; color: #666; font-size: 12px;">
        You received this email because you signed up for stock notifications on Villen Fashion.
      </p>
    `;
        return this.sendEmail(email, subject, html);
    }

    async sendAbandonedCartReminder(email: string, name: string, cartUrl: string) {
        const subject = "You left something behind!";
        const html = `
      <h1>Hi ${name}! 👋</h1>
      <p>Looks like you forgot a few items in your cart.</p>
      <p>Your cart is waiting for you - complete your purchase before the items sell out!</p>
      <a href="${cartUrl}" style="display: inline-block; background: #E89F71; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
        Complete Your Order
      </a>
      <p style="color: #666; font-size: 12px;">
        Questions? Reply to this email and we'll help you out.
      </p>
    `;
        return this.sendEmail(email, subject, html);
    }
}

export const emailService = new EmailService();
