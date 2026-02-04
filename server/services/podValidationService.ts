/**
 * Proof of Delivery (POD) Validation Service
 * 
 * Validates delivery proof by:
 * 1. Extracting GPS coordinates from POD image EXIF data
 * 2. Comparing with shipping address coordinates using Haversine formula
 * 3. Flagging deliveries as suspicious if distance > threshold
 */

import { exifService, GpsCoordinates, ExifData } from './exifService';
import { logger } from '../logger';

// Suspicious delivery threshold in meters
const SUSPICIOUS_DISTANCE_THRESHOLD = 500;

/**
 * Earth's radius in meters (mean radius)
 */
const EARTH_RADIUS_METERS = 6371000;

export interface PodValidationResult {
    isValid: boolean;
    isSuspicious: boolean;
    distance: number | null; // in meters
    podCoordinates: GpsCoordinates | null;
    shippingCoordinates: GpsCoordinates | null;
    reason: string;
}

export interface ShippingAddressWithCoords {
    fullName: string;
    addressLine1: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    latitude?: number;
    longitude?: number;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @returns Distance in meters
 */
export function haversineDistance(coord1: GpsCoordinates, coord2: GpsCoordinates): number {
    const lat1 = toRadians(coord1.latitude);
    const lat2 = toRadians(coord2.latitude);
    const deltaLat = toRadians(coord2.latitude - coord1.latitude);
    const deltaLon = toRadians(coord2.longitude - coord1.longitude);

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_METERS * c;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
}

export class PodValidationService {
    /**
     * Validate a Proof of Delivery image against shipping address
     * 
     * @param imagePath Path to the POD image
     * @param shippingAddress Shipping address with optional coordinates
     * @returns Validation result with distance and suspicious flag
     */
    static async validateDelivery(
        imagePath: string,
        shippingAddress: ShippingAddressWithCoords
    ): Promise<PodValidationResult> {
        try {
            // Extract EXIF data from image
            const exifData = await exifService.extractFromFile(imagePath);

            if (exifData.error) {
                logger.warn(`POD validation: EXIF extraction error - ${exifData.error}`);
                return {
                    isValid: true, // Allow delivery to proceed
                    isSuspicious: false,
                    distance: null,
                    podCoordinates: null,
                    shippingCoordinates: null,
                    reason: `Could not extract GPS data: ${exifData.error}`
                };
            }

            // Check if POD has GPS data
            if (!exifService.hasGpsData(exifData)) {
                logger.info('POD validation: No GPS data in image');
                return {
                    isValid: true, // Allow delivery to proceed
                    isSuspicious: false,
                    distance: null,
                    podCoordinates: null,
                    shippingCoordinates: null,
                    reason: 'No GPS data in image - unable to verify location'
                };
            }

            // Check if shipping address has coordinates
            if (!shippingAddress.latitude || !shippingAddress.longitude) {
                logger.info('POD validation: No coordinates for shipping address');
                return {
                    isValid: true,
                    isSuspicious: false,
                    distance: null,
                    podCoordinates: exifData.gps,
                    shippingCoordinates: null,
                    reason: 'Shipping address does not have coordinates for comparison'
                };
            }

            const shippingCoords: GpsCoordinates = {
                latitude: shippingAddress.latitude,
                longitude: shippingAddress.longitude
            };

            // Calculate distance
            const distance = haversineDistance(exifData.gps!, shippingCoords);
            const isSuspicious = distance > SUSPICIOUS_DISTANCE_THRESHOLD;

            logger.info(`POD validation: Distance ${formatDistance(distance)}, Suspicious: ${isSuspicious}`);

            return {
                isValid: true,
                isSuspicious,
                distance: Math.round(distance),
                podCoordinates: exifData.gps,
                shippingCoordinates: shippingCoords,
                reason: isSuspicious
                    ? `POD image taken ${formatDistance(distance)} from shipping address (threshold: ${SUSPICIOUS_DISTANCE_THRESHOLD}m)`
                    : `POD location verified (${formatDistance(distance)} from address)`
            };
        } catch (error) {
            logger.error('POD validation error:', error);
            return {
                isValid: true, // Allow delivery to proceed even on error
                isSuspicious: false,
                distance: null,
                podCoordinates: null,
                shippingCoordinates: null,
                reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Validate POD from a buffer (for file uploads)
     */
    static async validateDeliveryFromBuffer(
        imageBuffer: Buffer,
        shippingAddress: ShippingAddressWithCoords
    ): Promise<PodValidationResult> {
        try {
            const exifData = await exifService.extractFromBuffer(imageBuffer);

            // Same validation logic as above
            if (!exifService.hasGpsData(exifData)) {
                return {
                    isValid: true,
                    isSuspicious: false,
                    distance: null,
                    podCoordinates: null,
                    shippingCoordinates: null,
                    reason: 'No GPS data in image'
                };
            }

            if (!shippingAddress.latitude || !shippingAddress.longitude) {
                return {
                    isValid: true,
                    isSuspicious: false,
                    distance: null,
                    podCoordinates: exifData.gps,
                    shippingCoordinates: null,
                    reason: 'Shipping address does not have coordinates'
                };
            }

            const shippingCoords: GpsCoordinates = {
                latitude: shippingAddress.latitude,
                longitude: shippingAddress.longitude
            };

            const distance = haversineDistance(exifData.gps!, shippingCoords);
            const isSuspicious = distance > SUSPICIOUS_DISTANCE_THRESHOLD;

            return {
                isValid: true,
                isSuspicious,
                distance: Math.round(distance),
                podCoordinates: exifData.gps,
                shippingCoordinates: shippingCoords,
                reason: isSuspicious
                    ? `POD image taken ${formatDistance(distance)} from shipping address`
                    : `POD location verified (${formatDistance(distance)} from address)`
            };
        } catch (error) {
            return {
                isValid: true,
                isSuspicious: false,
                distance: null,
                podCoordinates: null,
                shippingCoordinates: null,
                reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Get the suspicious distance threshold
     */
    static getSuspiciousThreshold(): number {
        return SUSPICIOUS_DISTANCE_THRESHOLD;
    }
}

export const podValidationService = PodValidationService;
