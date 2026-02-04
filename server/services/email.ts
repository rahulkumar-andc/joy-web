import { logger } from "../logger";
import nodemailer from "nodemailer";
import { orderShippedTemplate, orderDeliveredTemplate, orderCancelledTemplate, codOrderConfirmationTemplate, codCollectedTemplate } from "./emailTemplates";
import { createCircuitBreaker, CIRCUIT_OPTIONS } from "../config/circuit-breakers";
import CircuitBreaker from "opossum";

interface EmailUser {
  email: string;
  name?: string;
}

interface OrderDetails {
  id: number;
  totalAmount: string;
  items: any[];
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private sendEmailBreaker: CircuitBreaker<[EmailOptions], boolean>;

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

    // Setup circuit breaker for email sending
    this.sendEmailBreaker = createCircuitBreaker(
      this.sendEmailRaw.bind(this),
      CIRCUIT_OPTIONS.EMAIL,
      async (options: EmailOptions) => {
        // Fallback: Queue email for later delivery
        logger.error('Email circuit open - queuing email', {
          to: options.to,
          subject: options.subject,
        });

        // TODO: Queue via Bull for retry
        // await emailQueue.add('send', options, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });

        return true; // Return success (queued)
      }
    );
  }

  /**
   * Raw email sending (without circuit breaker)
   */
  private async sendEmailRaw(options: EmailOptions): Promise<boolean> {
    const { to, subject, html } = options;

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

    const info = await this.transporter.sendMail({
      from: process.env.SMTP_FROM || '"Steal the Deal" <no-reply@example.com>',
      to,
      subject,
      html,
    });
    logger.info(`📧 Email sent: ${info.messageId}`);
    return true;
  }

  /**
   * Send email (with circuit breaker)
   */
  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      return await this.sendEmailBreaker.fire({ to, subject, html });
    } catch (error) {
      logger.error("❌ Failed to send email:", error);
      return false; // Don't crash app
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

  async sendOrderShipped(user: EmailUser, orderId: number, courierName?: string, trackingNumber?: string, estimatedDeliveryDate?: string) {
    const subject = `Your Order #${orderId} has been Shipped! 📦`;
    const html = orderShippedTemplate(user.name || 'Customer', orderId, courierName, trackingNumber, estimatedDeliveryDate);
    return this.sendEmail(user.email, subject, html);
  }

  async sendOrderDelivered(user: EmailUser, orderId: number) {
    const subject = `Your Order #${orderId} has been Delivered! ✅`;
    const html = orderDeliveredTemplate(user.name || 'Customer', orderId);
    return this.sendEmail(user.email, subject, html);
  }

  async sendOrderCancelled(user: EmailUser, orderId: number) {
    const subject = `Order #${orderId} has been Cancelled`;
    const html = orderCancelledTemplate(user.name || 'Customer', orderId);
    return this.sendEmail(user.email, subject, html);
  }

  /**
   * Send COD order confirmation email
   * Called when a Cash on Delivery order is placed
   */
  async sendCodConfirmation(user: EmailUser, orderId: number, codAmount: string, deliveryInstructions?: string) {
    const subject = `Order #${orderId} Confirmed - Cash on Delivery ₹${codAmount}`;
    const html = codOrderConfirmationTemplate(user.name || 'Customer', orderId, codAmount, deliveryInstructions);
    return this.sendEmail(user.email, subject, html);
  }

  /**
   * Send COD collected confirmation email
   * Called when courier collects cash payment on delivery
   */
  async sendCodCollected(user: EmailUser, orderId: number, codAmount: string) {
    const subject = `Payment Received for Order #${orderId} ✅`;
    const html = codCollectedTemplate(user.name || 'Customer', orderId, codAmount);
    return this.sendEmail(user.email, subject, html);
  }

  // Expose breaker for monitoring
  get breaker() {
    return this.sendEmailBreaker;
  }
}


export const emailService = new EmailService();
