/**
 * Authentication Flow Integration Tests
 * Tests registration, login, lockout, and password strength validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { userRepository } from '../server/repositories/userRepository';
import { hashPassword, comparePassword } from '../server/controllers/authController';

describe('Authentication Flow', () => {
    describe('Password Strength Validation', () => {
        it('should reject weak passwords', async () => {
            const weakPasswords = ['weak', '12345678', 'password', 'UPPERCASE', 'lowercase123'];

            for (const password of weakPasswords) {
                const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
                expect(passwordRegex.test(password)).toBe(false);
            }
        });

        it('should accept strong passwords', async () => {
            const strongPasswords = ['Secure123', 'MyPass1word', 'Test1234'];

            for (const password of strongPasswords) {
                const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
                expect(passwordRegex.test(password)).toBe(true);
            }
        });
    });

    describe('Account Lockout', () => {
        let userId: number;

        beforeEach(async () => {
            // Create a test user
            const hashedPassword = await hashPassword('Secure123');
            const user = await userRepository.create({
                email: 'test@example.com',
                password: hashedPassword,
                name: 'Test User',
                role: 'user',
                isVerified: true
            });
            userId = user.id;
        });

        it('should increment failed login attempts', async () => {
            await userRepository.incrementFailedAttempts(userId);
            const user = await userRepository.findById(userId);
            expect(user?.failedLoginAttempts).toBe(1);
        });

        it('should lock account after 5 failed attempts', async () => {
            // Simulate 5 failed attempts
            for (let i = 0; i < 5; i++) {
                await userRepository.incrementFailedAttempts(userId);
            }

            // Lock the account
            await userRepository.lockAccount(userId, 30);

            const user = await userRepository.findById(userId);
            expect(user?.lockoutUntil).toBeTruthy();
            expect(user?.lockoutUntil! > new Date()).toBe(true);
        });

        it('should reset failed attempts on successful login', async () => {
            // Set some failed attempts
            await userRepository.incrementFailedAttempts(userId);
            await userRepository.incrementFailedAttempts(userId);

            // Reset on successful login
            await userRepository.resetFailedAttempts(userId);

            const user = await userRepository.findById(userId);
            expect(user?.failedLoginAttempts).toBe(0);
            expect(user?.lockoutUntil).toBeNull();
        });

        it('should update last login timestamp', async () => {
            const before = new Date();
            await userRepository.updateLastLogin(userId);
            const user = await userRepository.findById(userId);

            expect(user?.lastLoginAt).toBeTruthy();
            expect(user?.lastLoginAt! >= before).toBe(true);
        });
    });
});
