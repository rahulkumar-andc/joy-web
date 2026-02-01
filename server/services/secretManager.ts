/**
 * Secret Manager Service
 * 
 * Abstraction for retrieving secrets.
 * Currently supports: Environment Variables (local/k8s secrets)
 * Future support: AWS Secrets Manager, HashiCorp Vault, Google Secret Manager
 */

import { config } from "../config";
import { logger } from "../logger";

export interface ISecretManager {
    getSecret(key: string): Promise<string>;
}

export class EnvSecretManager implements ISecretManager {
    async getSecret(key: string): Promise<string> {
        // In our current setup, config is already strictly typed and validated at startup
        // But for dynamic access or if we move to async remote fetch, this structure helps.

        const value = (config as any)[key] || process.env[key];

        if (!value) {
            logger.warn(`Secret ${key} requested but not found`);
            throw new Error(`Secret ${key} not found`);
        }

        return value;
    }
}

// Singleton instance
// In production, we might swap this class based on NODE_ENV or configuration
export const SecretManager = new EnvSecretManager();
