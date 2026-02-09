export class NotificationService {
    static async sendEmail(to: string, subject: string, body: string) {
        // Mock Implementation
        console.log("========================================");
        console.log(`[MOCK EMAIL] To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log("----------------------------------------");
        console.log(body);
        console.log("========================================");
        return true;
    }

    static async sendSMS(to: string, message: string) {
        // Mock Implementation
        if (!to) return false;
        console.log("========================================");
        console.log(`[MOCK SMS] To: ${to}`);
        console.log(`Message: ${message}`);
        console.log("========================================");
        return true;
    }

    static async notifyOrderStatusChange(email: string, orderId: number, status: string, name: string) {
        const subject = `Order #${orderId} Update: ${status}`;
        const body = `Hi ${name},\n\nYour order #${orderId} status has been updated to: ${status.toUpperCase()}.\n\nThank you for shopping with us!`;
        await this.sendEmail(email, subject, body);
    }

    static async notifyRefundUpdate(email: string, refundId: number, status: string, name: string) {
        const subject = `Refund Request #${refundId} Update`;
        const body = `Hi ${name},\n\nYour refund request #${refundId} has been ${status.toUpperCase()}.\n\nView details in your profile.`;
        await this.sendEmail(email, subject, body);
    }

    static async sendAbandonedCartEmail(email: string, name: string, cartUrl: string) {
        const subject = "You left something behind!";
        const body = `Hi ${name},\n\nWe noticed you left some items in your cart. They are selling out fast!\n\nComplete your purchase here: ${cartUrl}\n\nWarm regards,\nVillen Music Team`;
        await this.sendEmail(email, subject, body);
    }

    static async notifyMentions(mentions: string[], ticketId: number, message: any, senderName: string) {
        try {
            const { userRepository } = await import("../repositories/userRepository");
            // Remove @ and duplicates
            const usernames = mentions.map(m => m.substring(1)).filter((v, i, a) => a.indexOf(v) === i);

            for (const username of usernames) {
                const user = await userRepository.findByUsername(username);
                if (user && user.email) {
                    const subject = `You were mentioned in Ticket #${ticketId}`;
                    const body = `Hi ${user.name},\n\n${senderName} mentioned you in an internal note on Ticket #${ticketId}:\n\n"${message.message}"\n\nView ticket: ${process.env.APP_URL || 'http://localhost:5000'}/admin/support/${ticketId}`;
                    await this.sendEmail(user.email, subject, body);
                }
            }
        } catch (error) {
            console.error("Failed to notify mentions:", error);
        }
    }
}
