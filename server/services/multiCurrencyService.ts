/**
 * Multi-Currency Service
 * 
 * Handles currency conversion and multi-currency pricing
 */

import { logger } from '../logger';

export interface CurrencyRate {
    code: string;
    name: string;
    symbol: string;
    rate: number; // Conversion rate from INR (base currency)
}

// Supported currencies
const CURRENCIES: Record<string, CurrencyRate> = {
    INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', rate: 1 },
    USD: { code: 'USD', name: 'US Dollar', symbol: '$', rate: 0.012 },
    EUR: { code: 'EUR', name: 'Euro', symbol: '€', rate: 0.011 },
    GBP: { code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.009 },
    AED: { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', rate: 0.044 },
    SAR: { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', rate: 0.045 },
};

export class MultiCurrencyService {
    /**
     * Convert amount from INR to target currency
     */
    convertFromINR(amountINR: number, targetCurrency: string): number {
        const currency = CURRENCIES[targetCurrency.toUpperCase()];

        if (!currency) {
            throw new Error(`Unsupported currency: ${targetCurrency}`);
        }

        return amountINR * currency.rate;
    }

    /**
     * Convert amount to INR from source currency
     */
    convertToINR(amount: number, sourceCurrency: string): number {
        const currency = CURRENCIES[sourceCurrency.toUpperCase()];

        if (!currency) {
            throw new Error(`Unsupported currency: ${sourceCurrency}`);
        }

        return amount / currency.rate;
    }

    /**
     * Format amount with currency symbol
     */
    formatAmount(amount: number, currencyCode: string): string {
        const currency = CURRENCIES[currencyCode.toUpperCase()];

        if (!currency) {
            return `${amount.toFixed(2)}`;
        }

        return `${currency.symbol}${amount.toFixed(2)}`;
    }

    /**
     * Get all supported currencies
     */
    getSupportedCurrencies(): CurrencyRate[] {
        return Object.values(CURRENCIES);
    }

    /**
     * Get currency info
     */
    getCurrency(code: string): CurrencyRate | null {
        return CURRENCIES[code.toUpperCase()] || null;
    }

    /**
     * Update exchange rates (in production, fetch from API like exchangerate-api.com)
     */
    async updateExchangeRates(): Promise<void> {
        // In production, you would fetch latest rates from an API
        // For now, using static rates
        logger.info('Exchange rates would be updated here in production');

        // Example API integration:
        // const response = await fetch('https://api.exchangerate-api.com/v4/latest/INR');
        // const data = await response.json();
        // Update CURRENCIES with new rates
    }

    /**
     * Convert product price to user's currency
     */
    convertProductPrice(priceINR: string, targetCurrency: string): {
        original: number;
        converted: number;
        currency: string;
        formatted: string;
    } {
        const original = parseFloat(priceINR);
        const converted = this.convertFromINR(original, targetCurrency);

        return {
            original,
            converted,
            currency: targetCurrency,
            formatted: this.formatAmount(converted, targetCurrency)
        };
    }
}

export const multiCurrencyService = new MultiCurrencyService();
