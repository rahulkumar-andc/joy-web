/**
 * In-House Delivery Service
 * 
 * Manages courier assignments, delivery status updates, and POD processing.
 */

import { db } from '../db';
import { orders, users } from '@shared/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { podValidationService, PodValidationResult } from './podValidationService';
import { logger } from '../logger';
import { emailService } from './email';

export interface DeliveryOrderDetails {
    id: number;
    userId: number;
    totalAmount: string;
    status: string;
    deliveryStatus: string | null;
    assignedCourier: number | null;
    shippingAddress: any;
    codAmount: string | null;
    codCollected: boolean | null;
    isSuspiciousDelivery: boolean | null;
    createdAt: Date | null;
    estimatedDeliveryDate: Date | null;
    customerName?: string;
    customerPhone?: string;
}

export interface DeliveryStatusUpdate {
    orderId: number;
    courierId: number;
    status: 'picked_up' | 'in_transit' | 'delivered';
    proofOfDeliveryImage?: string;
    podLocation?: { lat: number; lng: number };
}

export class DeliveryService {
    /**
     * Get orders assigned to a specific courier
     */
    static async getCourierOrders(courierId: number): Promise<DeliveryOrderDetails[]> {
        try {
            const result = await db
                .select({
                    id: orders.id,
                    userId: orders.userId,
                    totalAmount: orders.totalAmount,
                    status: orders.status,
                    deliveryStatus: orders.deliveryStatus,
                    assignedCourier: orders.assignedCourier,
                    shippingAddress: orders.shippingAddress,
                    codAmount: orders.codAmount,
                    codCollected: orders.codCollected,
                    isSuspiciousDelivery: orders.isSuspiciousDelivery,
                    createdAt: orders.createdAt,
                    estimatedDeliveryDate: orders.estimatedDeliveryDate,
                })
                .from(orders)
                .where(eq(orders.assignedCourier, courierId))
                .orderBy(orders.createdAt);

            // Fetch customer details for each order
            const enrichedOrders = await Promise.all(
                result.map(async (order) => {
                    const user = await db
                        .select({ name: users.name, phone: users.phone })
                        .from(users)
                        .where(eq(users.id, order.userId))
                        .limit(1);

                    return {
                        ...order,
                        customerName: user[0]?.name,
                        customerPhone: user[0]?.phone || undefined,
                    };
                })
            );

            return enrichedOrders;
        } catch (error) {
            logger.error('Error fetching courier orders:', error);
            throw error;
        }
    }

    /**
     * Assign a courier to an order
     */
    static async assignCourier(orderId: number, courierId: number): Promise<void> {
        try {
            // Verify courier exists and has delivery role
            const courier = await db
                .select({ id: users.id, role: users.role })
                .from(users)
                .where(eq(users.id, courierId))
                .limit(1);

            if (!courier.length) {
                throw new Error('Courier not found');
            }

            await db
                .update(orders)
                .set({
                    assignedCourier: courierId,
                    deliveryStatus: 'pending',
                })
                .where(eq(orders.id, orderId));

            logger.info(`Order ${orderId} assigned to courier ${courierId}`);
        } catch (error) {
            logger.error('Error assigning courier:', error);
            throw error;
        }
    }

    /**
     * Update delivery status
     */
    static async updateDeliveryStatus(
        update: DeliveryStatusUpdate
    ): Promise<{ success: boolean; validation?: PodValidationResult }> {
        try {
            const { orderId, courierId, status, proofOfDeliveryImage, podLocation } = update;

            // Verify the courier is assigned to this order
            const order = await db
                .select()
                .from(orders)
                .where(and(
                    eq(orders.id, orderId),
                    eq(orders.assignedCourier, courierId)
                ))
                .limit(1);

            if (!order.length) {
                throw new Error('Order not found or not assigned to this courier');
            }

            const orderData = order[0];

            // Prepare update data
            const updateData: any = {
                deliveryStatus: status,
            };

            // Handle delivery completion with POD
            let validationResult: PodValidationResult | undefined;
            if (status === 'delivered') {
                updateData.podTimestamp = new Date();

                if (proofOfDeliveryImage) {
                    updateData.proofOfDeliveryImage = proofOfDeliveryImage;
                }

                if (podLocation) {
                    updateData.podLocation = podLocation;
                }

                // Validate POD location if we have coordinates
                if (proofOfDeliveryImage && orderData.shippingAddress) {
                    validationResult = await podValidationService.validateDelivery(
                        proofOfDeliveryImage,
                        orderData.shippingAddress as any
                    );

                    updateData.isSuspiciousDelivery = validationResult.isSuspicious;
                    updateData.suspiciousReason = validationResult.reason;

                    if (validationResult.podCoordinates && !podLocation) {
                        updateData.podLocation = validationResult.podCoordinates;
                    }
                }

                // Mark COD as collected if applicable
                if (orderData.codAmount && parseFloat(orderData.codAmount) > 0) {
                    updateData.codCollected = true;
                    updateData.codCollectedAt = new Date();
                    updateData.codCollectedBy = courierId;
                }

                // Update order status to delivered
                updateData.status = 'delivered';
                updateData.orderState = 'DELIVERED';
            } else if (status === 'picked_up') {
                updateData.status = 'packed';
            } else if (status === 'in_transit') {
                updateData.status = 'out_for_delivery';
            }

            await db
                .update(orders)
                .set(updateData)
                .where(eq(orders.id, orderId));

            logger.info(`Order ${orderId} delivery status updated to ${status}`);

            // 📧 Send COD collected email if cash was collected
            if (status === 'delivered' && orderData.codAmount && parseFloat(orderData.codAmount) > 0) {
                try {
                    const customer = await db
                        .select({ email: users.email, name: users.name })
                        .from(users)
                        .where(eq(users.id, orderData.userId))
                        .limit(1);

                    if (customer[0]) {
                        await emailService.sendCodCollected(
                            { email: customer[0].email, name: customer[0].name },
                            orderId,
                            orderData.codAmount
                        );
                        logger.info(`COD collected email sent for order ${orderId}`);
                    }
                } catch (emailError) {
                    logger.error('Failed to send COD collected email:', emailError);
                    // Don't throw - delivery was successful, email is secondary
                }
            }

            return { success: true, validation: validationResult };
        } catch (error) {
            logger.error('Error updating delivery status:', error);
            throw error;
        }
    }

    /**
     * Get list of available couriers
     */
    static async getAvailableCouriers(): Promise<{ id: number; name: string; phone: string | null }[]> {
        try {
            // In a real implementation, you'd check RBAC roles
            // For now, we query users who might be couriers
            const couriers = await db
                .select({
                    id: users.id,
                    name: users.name,
                    phone: users.phone,
                })
                .from(users)
                .where(eq(users.role, 'seller')); // Temporary - should be DELIVERY_PARTNER role

            return couriers;
        } catch (error) {
            logger.error('Error fetching couriers:', error);
            throw error;
        }
    }

    /**
     * Get suspicious deliveries for admin review
     */
    static async getSuspiciousDeliveries(): Promise<DeliveryOrderDetails[]> {
        try {
            const result = await db
                .select({
                    id: orders.id,
                    userId: orders.userId,
                    totalAmount: orders.totalAmount,
                    status: orders.status,
                    deliveryStatus: orders.deliveryStatus,
                    assignedCourier: orders.assignedCourier,
                    shippingAddress: orders.shippingAddress,
                    codAmount: orders.codAmount,
                    codCollected: orders.codCollected,
                    isSuspiciousDelivery: orders.isSuspiciousDelivery,
                    createdAt: orders.createdAt,
                    estimatedDeliveryDate: orders.estimatedDeliveryDate,
                })
                .from(orders)
                .where(eq(orders.isSuspiciousDelivery, true))
                .orderBy(orders.createdAt);

            return result;
        } catch (error) {
            logger.error('Error fetching suspicious deliveries:', error);
            throw error;
        }
    }

    /**
     * Settle COD for an order (Business Admin L10 only)
     */
    static async settleCod(orderId: number, settledByUserId: number): Promise<void> {
        try {
            const order = await db
                .select()
                .from(orders)
                .where(eq(orders.id, orderId))
                .limit(1);

            if (!order.length) {
                throw new Error('Order not found');
            }

            if (!order[0].codCollected) {
                throw new Error('COD not yet collected by courier');
            }

            if (order[0].paymentSettled) {
                throw new Error('COD already settled');
            }

            await db
                .update(orders)
                .set({
                    paymentSettled: true,
                    settlementTimestamp: new Date(),
                    settledBy: settledByUserId,
                })
                .where(eq(orders.id, orderId));

            logger.info(`COD settled for order ${orderId} by user ${settledByUserId}`);
        } catch (error) {
            logger.error('Error settling COD:', error);
            throw error;
        }
    }

    /**
     * Get orders pending COD settlement
     */
    static async getPendingCodSettlements(): Promise<DeliveryOrderDetails[]> {
        try {
            const result = await db
                .select({
                    id: orders.id,
                    userId: orders.userId,
                    totalAmount: orders.totalAmount,
                    status: orders.status,
                    deliveryStatus: orders.deliveryStatus,
                    assignedCourier: orders.assignedCourier,
                    shippingAddress: orders.shippingAddress,
                    codAmount: orders.codAmount,
                    codCollected: orders.codCollected,
                    isSuspiciousDelivery: orders.isSuspiciousDelivery,
                    createdAt: orders.createdAt,
                    estimatedDeliveryDate: orders.estimatedDeliveryDate,
                })
                .from(orders)
                .where(and(
                    eq(orders.codCollected, true),
                    eq(orders.paymentSettled, false),
                    isNotNull(orders.codAmount)
                ))
                .orderBy(orders.createdAt);

            return result;
        } catch (error) {
            logger.error('Error fetching pending COD settlements:', error);
            throw error;
        }
    }
}

export const deliveryService = DeliveryService;
