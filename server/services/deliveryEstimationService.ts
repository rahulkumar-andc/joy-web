/**
 * Delivery Date Estimation Service
 * 
 * Calculates estimated delivery dates based on:
 * - Customer's shipping address (pincode/city)
 * - Product availability
 * - Standard shipping zones
 */

import { logger } from '../logger';

interface DeliveryEstimate {
    estimatedDays: number;
    minDate: Date;
    maxDate: Date;
    deliveryType: 'standard' | 'express' | 'same-day';
    shippingCharge: number;
}

interface ShippingZone {
    name: string;
    pincodeRanges: { start: string; end: string }[];
    cities: string[];
    standardDays: number;
    expressDays?: number;
    sameDayAvailable?: boolean;
}

export class DeliveryEstimationService {
    // Define shipping zones for India
    private static SHIPPING_ZONES: ShippingZone[] = [
        {
            name: 'Metro Cities - Same Day',
            cities: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad'],
            pincodeRanges: [
                { start: '110001', end: '110096' }, // Delhi
                { start: '400001', end: '400104' }, // Mumbai
                { start: '560001', end: '560107' }, // Bangalore
                { start: '500001', end: '500100' }, // Hyderabad
                { start: '600001', end: '600127' }, // Chennai
                { start: '700001', end: '700156' }, // Kolkata
            ],
            standardDays: 2,
            expressDays: 1,
            sameDayAvailable: true
        },
        {
            name: 'Tier 1 Cities',
            cities: ['Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Navi Mumbai', 'Allahabad', 'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur', 'Gwalior', 'Vijayawada'],
            pincodeRanges: [],
            standardDays: 3,
            expressDays: 2
        },
        {
            name: 'Tier 2 Cities',
            cities: [],
            pincodeRanges: [],
            standardDays: 4,
            expressDays: 3
        },
        {
            name: 'Northeast & Remote Areas',
            cities: ['Guwahati', 'Shillong', 'Imphal', 'Agartala', 'Aizawl', 'Kohima', 'Itanagar'],
            pincodeRanges: [
                { start: '781001', end: '788931' }, // Assam, Meghalaya, etc.
            ],
            standardDays: 7,
            expressDays: 5
        },
        {
            name: 'Remote/Hill Stations',
            cities: ['Leh', 'Manali', 'Shimla', 'Gangtok', 'Darjeeling'],
            pincodeRanges: [],
            standardDays: 10,
            expressDays: 7
        }
    ];

    /**
     * Get delivery estimate based on shipping address
     */
    static getDeliveryEstimate(
        city: string,
        pincode: string,
        deliveryType: 'standard' | 'express' | 'same-day' = 'standard'
    ): DeliveryEstimate {
        const zone = this.findShippingZone(city, pincode);

        let estimatedDays: number;
        let shippingCharge: number;

        switch (deliveryType) {
            case 'same-day':
                if (!zone.sameDayAvailable) {
                    logger.warn(`Same-day delivery not available for ${city}. Falling back to express.`);
                    deliveryType = 'express';
                    estimatedDays = zone.expressDays || zone.standardDays;
                    shippingCharge = 150;
                } else {
                    estimatedDays = 0; // Same day
                    shippingCharge = 200;
                }
                break;
            case 'express':
                estimatedDays = zone.expressDays || zone.standardDays;
                shippingCharge = 150;
                break;
            case 'standard':
            default:
                estimatedDays = zone.standardDays;
                shippingCharge = estimatedDays <= 3 ? 0 : 100; // Free shipping for fast zones
                break;
        }

        const minDate = this.calculateDeliveryDate(estimatedDays);
        const maxDate = this.calculateDeliveryDate(estimatedDays + 2); // Add buffer

        return {
            estimatedDays,
            minDate,
            maxDate,
            deliveryType,
            shippingCharge
        };
    }

    /**
     * Find shipping zone for given city/pincode
     */
    private static findShippingZone(city: string, pincode: string): ShippingZone {
        // Normalize city name
        const normalizedCity = city.trim().toLowerCase();

        // Check each zone
        for (const zone of this.SHIPPING_ZONES) {
            // Check city match
            if (zone.cities.some(c => c.toLowerCase() === normalizedCity)) {
                return zone;
            }

            // Check pincode range match
            for (const range of zone.pincodeRanges) {
                if (pincode >= range.start && pincode <= range.end) {
                    return zone;
                }
            }
        }

        // Default to Tier 2 if no match
        return this.SHIPPING_ZONES.find(z => z.name === 'Tier 2 Cities') || this.SHIPPING_ZONES[2];
    }

    /**
     * Calculate delivery date considering weekends and holidays
     */
    private static calculateDeliveryDate(daysToAdd: number): Date {
        const today = new Date();
        let deliveryDate = new Date(today);
        let addedDays = 0;

        while (addedDays < daysToAdd) {
            deliveryDate.setDate(deliveryDate.getDate() + 1);

            // Skip Sundays (0 = Sunday)
            if (deliveryDate.getDay() !== 0) {
                addedDays++;
            }
        }

        return deliveryDate;
    }

    /**
     * Format delivery estimate for display
     */
    static formatDeliveryEstimate(estimate: DeliveryEstimate): string {
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        };

        if (estimate.estimatedDays === 0) {
            return 'Delivery by today';
        } else if (estimate.estimatedDays === 1) {
            return `Delivery by tomorrow (${estimate.minDate.toLocaleDateString('en-IN', options)})`;
        } else {
            return `Delivery between ${estimate.minDate.toLocaleDateString('en-IN', options)} - ${estimate.maxDate.toLocaleDateString('en-IN', options)}`;
        }
    }

    /**
     * Check if express delivery is available
     */
    static isExpressAvailable(city: string, pincode: string): boolean {
        const zone = this.findShippingZone(city, pincode);
        return zone.expressDays !== undefined;
    }

    /**
     * Check if same-day delivery is available
     */
    static isSameDayAvailable(city: string, pincode: string): boolean {
        const zone = this.findShippingZone(city, pincode);
        return zone.sameDayAvailable || false;
    }
}

export const deliveryEstimationService = DeliveryEstimationService;
