/**
 * XSS Sanitization Helper
 * 
 * Sanitizes user-generated content to prevent XSS attacks.
 * Uses DOMPurify for HTML sanitization and basic string escaping.
 */

import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/**
 * Sanitize HTML content (for rich text, product descriptions, reviews)
 * Removes dangerous tags and attributes while preserving safe formatting
 */
export function sanitizeHtml(dirty: string): string {
    if (!dirty) return '';

    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: [
            'b', 'i', 'em', 'strong', 'u', 'p', 'br',
            'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'blockquote', 'code', 'pre'
        ],
        ALLOWED_ATTR: ['class'], // Only allow class attribute for styling
        KEEP_CONTENT: true, // Keep text content even if tag is removed
        RETURN_TRUSTED_TYPE: false
    });
}

/**
 * Sanitize plain text (for names, addresses, simple fields)
 * Escapes HTML special characters
 */
export function sanitizeText(text: string): string {
    if (!text) return '';

    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize object with text fields
 * Useful for sanitizing entire request bodies
 */
export function sanitizeObject<T extends Record<string, any>>(
    obj: T,
    htmlFields: string[] = []
): T {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            // Check if this field should allow HTML
            if (htmlFields.includes(key)) {
                sanitized[key] = sanitizeHtml(value);
            } else {
                sanitized[key] = sanitizeText(value);
            }
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map(item =>
                typeof item === 'object' && item !== null
                    ? sanitizeObject(item, htmlFields)
                    : item
            );
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value, htmlFields);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized as T;
}

/**
 * Middleware to sanitize request body
 * Use this on routes that accept user-generated content
 */
export function sanitizeRequestBody(htmlFields: string[] = []) {
    return (req: any, res: any, next: any) => {
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body, htmlFields);
        }
        next();
    };
}
