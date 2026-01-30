export interface RefundItemInput {
    orderItemId: number;
    quantity: number;
    reason?: string;
}

export interface CreateRefundInput {
    reason: string;
    description?: string;
    refundMethod: 'original' | 'wallet';
    items?: RefundItemInput[]; // Optional for full refund (default) or legacy support
}
