import { db } from "../db";
import { payments, type Payment } from "@shared/schema";
import { eq } from "drizzle-orm";

export class PaymentRepository {
    async create(payment: any): Promise<Payment> {
        const [newPayment] = await db.insert(payments).values(payment).returning();
        return newPayment;
    }

    async updateStatus(razorpayOrderId: string, status: string, paymentId?: string, signature?: string, method?: string): Promise<Payment | undefined> {
        const [updated] = await db.update(payments)
            .set({
                status: status as any,
                razorpayPaymentId: paymentId,
                razorpaySignature: signature,
                paymentMethod: method,
                updatedAt: new Date()
            })
            .where(eq(payments.razorpayOrderId, razorpayOrderId))
            .returning();
        return updated;
    }

    async findByOrderId(orderId: number): Promise<Payment | undefined> {
        const [payment] = await db.select().from(payments).where(eq(payments.orderId, orderId));
        return payment;
    }

    async findByRazorpayOrderId(razorpayOrderId: string): Promise<Payment | undefined> {
        const [payment] = await db.select().from(payments).where(eq(payments.razorpayOrderId, razorpayOrderId));
        return payment;
    }
}

export const paymentRepository = new PaymentRepository();
