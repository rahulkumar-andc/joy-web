import { Router, Request, Response } from 'express';
import { deliveryEstimationService } from '../services/deliveryEstimationService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';
import { z } from 'zod';

export const deliveryRouter = Router();

const deliveryEstimateSchema = z.object({
    city: z.string().min(2, 'City is required'),
    pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode format'),
    deliveryType: z.enum(['standard', 'express', 'same-day']).optional().default('standard')
});

/**
 * GET /api/delivery/estimate
 * Get delivery estimate for a given address
 */
deliveryRouter.post('/api/delivery/estimate', catchAsync(async (req: Request, res: Response) => {
    const { city, pincode, deliveryType } = deliveryEstimateSchema.parse(req.body);

    const estimate = deliveryEstimationService.getDeliveryEstimate(city, pincode, deliveryType);
    const formatted = deliveryEstimationService.formatDeliveryEstimate(estimate);

    res.json({
        ...estimate,
        formattedEstimate: formatted,
        expressAvailable: deliveryEstimationService.isExpressAvailable(city, pincode),
        sameDayAvailable: deliveryEstimationService.isSameDayAvailable(city, pincode)
    });
}));

/**
 * GET /api/delivery/options/:city/:pincode
 * Get all available delivery options for a location
 */
deliveryRouter.get('/api/delivery/options/:city/:pincode', catchAsync(async (req: Request, res: Response) => {
    const city = req.params.city as string;
    const pincode = req.params.pincode as string;

    if (!/^\d{6}$/.test(pincode)) {
        throw new AppError('Invalid pincode format', 400);
    }

    const options = [];

    // Standard delivery
    const standard = deliveryEstimationService.getDeliveryEstimate(city, pincode, 'standard');
    options.push({
        type: 'standard',
        ...standard,
        label: 'Standard Delivery',
        formattedEstimate: deliveryEstimationService.formatDeliveryEstimate(standard)
    });

    // Express delivery
    if (deliveryEstimationService.isExpressAvailable(city, pincode)) {
        const express = deliveryEstimationService.getDeliveryEstimate(city, pincode, 'express');
        options.push({
            type: 'express',
            ...express,
            label: 'Express Delivery',
            formattedEstimate: deliveryEstimationService.formatDeliveryEstimate(express)
        });
    }

    // Same-day delivery
    if (deliveryEstimationService.isSameDayAvailable(city, pincode)) {
        const sameDay = deliveryEstimationService.getDeliveryEstimate(city, pincode, 'same-day');
        options.push({
            type: 'same-day',
            ...sameDay,
            label: 'Same Day Delivery',
            formattedEstimate: deliveryEstimationService.formatDeliveryEstimate(sameDay)
        });
    }

    res.json({ options });
}));

export default deliveryRouter;
