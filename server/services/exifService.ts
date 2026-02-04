/**
 * EXIF Metadata Extraction Service
 * 
 * Extracts GPS coordinates from JPEG images for Proof of Delivery validation.
 * Uses the jpeg-exif library to read EXIF metadata.
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../logger';

// Try to import jpeg-exif (may need fallback)
let exifParser: any;
try {
    exifParser = require('jpeg-exif');
} catch (e) {
    logger.warn('jpeg-exif not available, using fallback EXIF extraction');
}

export interface GpsCoordinates {
    latitude: number;
    longitude: number;
}

export interface ExifData {
    gps: GpsCoordinates | null;
    timestamp: Date | null;
    make: string | null;
    model: string | null;
    error?: string;
}

/**
 * Convert DMS (Degrees, Minutes, Seconds) to decimal degrees
 */
function dmsToDecimal(dms: number[], ref: string): number {
    if (!dms || dms.length !== 3) return 0;

    const [degrees, minutes, seconds] = dms;
    let decimal = degrees + minutes / 60 + seconds / 3600;

    // South and West are negative
    if (ref === 'S' || ref === 'W') {
        decimal = -decimal;
    }

    return decimal;
}

/**
 * Parse GPS rational values from EXIF format
 * EXIF stores GPS as arrays of rationals [numerator, denominator]
 */
function parseGpsRational(value: any): number[] {
    if (!value) return [0, 0, 0];

    // If already an array of numbers, return as-is
    if (Array.isArray(value) && typeof value[0] === 'number') {
        return value;
    }

    // If array of rationals [[n,d], [n,d], [n,d]]
    if (Array.isArray(value) && Array.isArray(value[0])) {
        return value.map(([num, den]: [number, number]) => num / den);
    }

    return [0, 0, 0];
}

export class ExifService {
    /**
     * Extract EXIF data from an image file
     */
    static async extractFromFile(filePath: string): Promise<ExifData> {
        try {
            if (!fs.existsSync(filePath)) {
                return { gps: null, timestamp: null, make: null, model: null, error: 'File not found' };
            }

            const ext = path.extname(filePath).toLowerCase();
            if (ext !== '.jpg' && ext !== '.jpeg') {
                return { gps: null, timestamp: null, make: null, model: null, error: 'Only JPEG files are supported' };
            }

            if (!exifParser) {
                return { gps: null, timestamp: null, make: null, model: null, error: 'EXIF parser not available' };
            }

            const exif = exifParser.parseSync(filePath);

            if (!exif) {
                return { gps: null, timestamp: null, make: null, model: null, error: 'No EXIF data found' };
            }

            return this.parseExifData(exif);
        } catch (error) {
            logger.error('Error extracting EXIF data:', error);
            return {
                gps: null,
                timestamp: null,
                make: null,
                model: null,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Extract EXIF data from a buffer
     */
    static async extractFromBuffer(buffer: Buffer): Promise<ExifData> {
        try {
            if (!exifParser) {
                return { gps: null, timestamp: null, make: null, model: null, error: 'EXIF parser not available' };
            }

            // Create a temporary file to parse
            const tempPath = path.join('/tmp', `pod_${Date.now()}.jpg`);
            fs.writeFileSync(tempPath, buffer);

            const result = await this.extractFromFile(tempPath);

            // Clean up
            fs.unlinkSync(tempPath);

            return result;
        } catch (error) {
            logger.error('Error extracting EXIF from buffer:', error);
            return {
                gps: null,
                timestamp: null,
                make: null,
                model: null,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Parse EXIF data object to extract relevant fields
     */
    private static parseExifData(exif: any): ExifData {
        let gps: GpsCoordinates | null = null;
        let timestamp: Date | null = null;

        // Extract GPS coordinates
        if (exif.GPSInfo || exif.gps) {
            const gpsData = exif.GPSInfo || exif.gps;

            const latDms = parseGpsRational(gpsData.GPSLatitude || gpsData.latitude);
            const latRef = gpsData.GPSLatitudeRef || gpsData.latitudeRef || 'N';
            const lonDms = parseGpsRational(gpsData.GPSLongitude || gpsData.longitude);
            const lonRef = gpsData.GPSLongitudeRef || gpsData.longitudeRef || 'E';

            const latitude = dmsToDecimal(latDms, latRef);
            const longitude = dmsToDecimal(lonDms, lonRef);

            // Only set GPS if we have valid coordinates
            if (latitude !== 0 || longitude !== 0) {
                gps = { latitude, longitude };
            }
        }

        // Extract timestamp
        if (exif.DateTimeOriginal || exif.CreateDate || exif.ModifyDate) {
            const dateStr = exif.DateTimeOriginal || exif.CreateDate || exif.ModifyDate;
            // EXIF date format: "YYYY:MM:DD HH:MM:SS"
            const parsed = dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
            timestamp = new Date(parsed);
        }

        return {
            gps,
            timestamp,
            make: exif.Make || null,
            model: exif.Model || null,
        };
    }

    /**
     * Check if image has GPS data
     */
    static hasGpsData(exifData: ExifData): boolean {
        return exifData.gps !== null &&
            !isNaN(exifData.gps.latitude) &&
            !isNaN(exifData.gps.longitude);
    }
}

export const exifService = ExifService;
