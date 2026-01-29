import { logger } from "../logger";

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
    async sendEmail(to: string, subject: string, html: string) {
        // MOCK: Log to console in development
        const divider = "=".repeat(50);
        logger.info(`\n${divider}`);
        logger.info(`📧 MOCK EMAIL SENT`);
        logger.info(`To: ${to}`);
        logger.info(`Subject: ${subject}`);
        logger.info(`Body Preview: ${html.substring(0, 100)}...`);
        logger.info(`${divider}\n`);
        return true;
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
        const resetLink = `http://localhost:5000/auth/reset?token=${token}`;
        const html = `
      <h1>Password Reset Request</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}">${resetLink}</a>
    `;
        return this.sendEmail(user.email, subject, html);
    }
}

export const emailService = new EmailService();
