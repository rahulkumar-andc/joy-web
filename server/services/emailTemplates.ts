/**
 * Branded Email Templates
 * Professional HTML email templates with consistent styling
 */

// Brand Colors
const COLORS = {
    primary: "#E89F71",      // Brand accent
    secondary: "#2D3748",    // Dark text
    success: "#48BB78",      // Green
    warning: "#ED8936",      // Orange
    danger: "#F56565",       // Red
    background: "#F7FAFC",   // Light gray
    white: "#FFFFFF",
};

/**
 * Base email wrapper with header and footer
 */
function emailWrapper(content: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Steal the Deal</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: ${COLORS.background};
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: ${COLORS.white};
        }
        .header {
            background: linear-gradient(135deg, ${COLORS.primary} 0%, #D4825A 100%);
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            color: ${COLORS.white};
            font-size: 28px;
            font-weight: 700;
        }
        .content {
            padding: 40px 30px;
            color: ${COLORS.secondary};
            line-height: 1.6;
        }
        .button {
            display: inline-block;
            padding: 14px 32px;
            background-color: ${COLORS.primary};
            color: ${COLORS.white};
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        .info-box {
            background-color: ${COLORS.background};
            border-left: 4px solid ${COLORS.primary};
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .footer {
            background-color: ${COLORS.secondary};
            color: rgba(255, 255, 255, 0.8);
            padding: 30px 20px;
            text-align: center;
            font-size: 14px;
        }
        .footer a {
            color: ${COLORS.primary};
            text-decoration: none;
        }
        .tracking-number {
            font-family: 'Courier New', monospace;
            background: ${COLORS.background};
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            color: ${COLORS.primary};
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛍️ Steal the Deal</h1>
        </div>
        ${content}
        <div class="footer">
            <p>Thank you for shopping with Steal the Deal</p>
            <p>Follow us: 
                <a href="#">Facebook</a> • 
                <a href="#">Twitter</a> • 
                <a href="#">Instagram</a>
            </p>
            <p style="margin-top: 20px; font-size: 12px; color: rgba(255, 255, 255, 0.6);">
                © 2026 Steal the Deal. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
    `.trim();
}

/**
 * Order Shipped Email Template
 */
export function orderShippedTemplate(
    userName: string,
    orderId: number,
    courierName?: string,
    trackingNumber?: string,
    estimatedDeliveryDate?: string
): string {
    const trackingInfo = courierName && trackingNumber ? `
        <div class="info-box">
            <h3 style="margin-top: 0; color: ${COLORS.primary};">📦 Tracking Information</h3>
            <p><strong>Courier:</strong> ${courierName}</p>
            <p><strong>Tracking Number:</strong> <span class="tracking-number">${trackingNumber}</span></p>
            ${estimatedDeliveryDate ? `<p><strong>Estimated Delivery:</strong> ${new Date(estimatedDeliveryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>` : ''}
        </div>
    ` : '';

    const content = `
        <div class="content">
            <h2 style="color: ${COLORS.primary}; margin-top: 0;">Your Order is on the Way! 🚚</h2>
            <p>Hi ${userName},</p>
            <p>Great news! Your order <strong>#${orderId}</strong> has been shipped and is on its way to you.</p>
            ${trackingInfo}
            <p>We'll notify you again once your order has been delivered.</p>
            <p style="margin-top: 30px;">If you have any questions, feel free to reply to this email.</p>
            <p style="color: ${COLORS.primary}; font-weight: 600;">Happy Shopping! 🎉</p>
        </div>
    `;

    return emailWrapper(content);
}

/**
 * Order Delivered Email Template
 */
export function orderDeliveredTemplate(userName: string, orderId: number): string {
    const content = `
        <div class="content">
            <h2 style="color: ${COLORS.success}; margin-top: 0;">Your Order has been Delivered! ✅</h2>
            <p>Hi ${userName},</p>
            <p>Your order <strong>#${orderId}</strong> has been successfully delivered.</p>
            <div class="info-box" style="border-left-color: ${COLORS.success};">
                <p style="margin: 0; font-size: 18px;">🎉 We hope you love your purchase!</p>
            </div>
            <p>If you have any questions or concerns about your order, please don't hesitate to contact us.</p>
            <p style="margin-top: 30px;">Would you like to leave a review for your items?</p>
            <a href="#" class="button">Write a Review</a>
            <p style="color: ${COLORS.success}; font-weight: 600; margin-top: 30px;">Thank you for choosing Steal the Deal!</p>
        </div>
    `;

    return emailWrapper(content);
}

/**
 * Order Cancelled Email Template
 */
export function orderCancelledTemplate(userName: string, orderId: number): string {
    const content = `
        <div class="content">
            <h2 style="color: ${COLORS.danger}; margin-top: 0;">Order Cancelled</h2>
            <p>Hi ${userName},</p>
            <p>Your order <strong>#${orderId}</strong> has been cancelled.</p>
            <div class="info-box" style="border-left-color: ${COLORS.danger};">
                <p style="margin: 0;">⚠️ If you didn't request this cancellation, please contact our support team immediately.</p>
            </div>
            <p>Any payment made for this order will be refunded within 5-7 business days.</p>
            <a href="#" class="button" style="background-color: ${COLORS.secondary};">Contact Support</a>
            <p style="margin-top: 30px; color: #718096;">Questions? Reply to this email and we'll help you out.</p>
        </div>
    `;

    return emailWrapper(content);
}

/**
 * COD Order Confirmation Email Template
 */
export function codOrderConfirmationTemplate(
    userName: string,
    orderId: number,
    codAmount: string,
    deliveryInstructions?: string
): string {
    const content = `
        <div class="content">
            <h2 style="color: ${COLORS.success}; margin-top: 0;">Order Confirmed! 🎉</h2>
            <p>Hi ${userName},</p>
            <p>Your order <strong>#${orderId}</strong> has been confirmed.</p>
            
            <div class="info-box" style="background-color: #FEF3C7; border-left-color: ${COLORS.warning};">
                <h3 style="margin-top: 0; color: ${COLORS.warning};">💵 Cash on Delivery</h3>
                <p style="font-size: 18px; margin: 10px 0;"><strong>Amount to pay: ₹${codAmount}</strong></p>
                <p style="margin: 0;">Please keep exact change ready when your order arrives.</p>
            </div>
            
            ${deliveryInstructions ? `
                <div class="info-box">
                    <h4 style="margin-top: 0;">📝 Your Delivery Instructions</h4>
                    <p style="margin: 0;">${deliveryInstructions}</p>
                </div>
            ` : ''}
            
            <p>Your order will be delivered soon. We'll send you tracking information once it's shipped.</p>
            
            <div style="background-color: ${COLORS.background}; padding: 20px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Important COD Instructions:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Payment accepted in cash only</li>
                    <li>Please verify your order before making payment</li>
                    <li>Get a delivery receipt from the courier</li>
                </ul>
            </div>
            
            <p style="color: ${COLORS.primary}; font-weight: 600; margin-top: 30px;">Thank you for shopping with us!</p>
        </div>
    `;

    return emailWrapper(content);
}

/**
 * COD Collected / Payment Received Email Template
 */
export function codCollectedTemplate(userName: string, orderId: number, codAmount: string): string {
    const content = `
        <div class="content">
            <h2 style="color: ${COLORS.success}; margin-top: 0;">Payment Received ✅</h2>
            <p>Hi ${userName},</p>
            <p>We have received your cash payment of <strong>₹${codAmount}</strong> for order <strong>#${orderId}</strong>.</p>
            
            <div class="info-box" style="border-left-color: ${COLORS.success};">
                <h3 style="margin-top: 0; color: ${COLORS.success};">🎉 Order Delivered Successfully!</h3>
                <p style="margin: 0;">Your order has been marked as delivered and payment has been confirmed.</p>
            </div>
            
            <p>We hope you love your purchase!</p>
            
            <p style="margin-top: 30px;">Would you like to leave a review for your items?</p>
            <a href="#" class="button">Write a Review</a>
            
            <p style="color: ${COLORS.success}; font-weight: 600; margin-top: 30px;">Thank you for choosing Steal the Deal!</p>
        </div>
    `;

    return emailWrapper(content);
}
