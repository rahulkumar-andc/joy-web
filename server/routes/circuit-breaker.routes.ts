import { Router } from 'express';
import { paymentService } from '../services/payments';
import { emailService } from '../services/email';
import { searchService } from '../services/search-service';
import { pushNotificationService } from '../services/pushNotificationService';
import { getCircuitStats } from '../config/circuit-breakers';
import { requirePermission } from '../middleware/rbac';
import CircuitBreaker from 'opossum';

const router = Router();

/**
 * GET /api/admin/circuit-breakers
 * Get status of all circuit breakers
 */
router.get(
    '/',
    requirePermission('system', 'read'),
    (req, res) => {
        // Ensure services are initialized
        if (!searchService.searchBreaker) {
            // Safe check if search service has init method
            if ('init' in searchService && typeof searchService.init === 'function') {
                searchService.init();
            }
        }

        const circuits = {
            payment: {
                createOrder: paymentService.breakers.createOrder ? getCircuitStats(paymentService.breakers.createOrder) : null,
                fetchPayment: paymentService.breakers.fetchPayment ? getCircuitStats(paymentService.breakers.fetchPayment) : null,
            },
            email: emailService.breaker ? getCircuitStats(emailService.breaker as unknown as CircuitBreaker<any, any>) : null,
            search: searchService.getBreakerStats ? searchService.getBreakerStats() : null,
            push: pushNotificationService.breaker ? getCircuitStats(pushNotificationService.breaker as unknown as CircuitBreaker<any, any>) : null,
        };

        res.json(circuits);
    }
);

export default router;
