/**
 * Database Read Replica Setup Guide
 * 
 * Complete guide for setting up and using read replicas
 */

# Database Read Replica Setup

## Overview
Read replicas distribute read traffic across multiple database instances, improving performance for read-heavy workloads.

---

## Benefits

✅ **Scale Read Operations**: Handle more concurrent read queries  
✅ **Reduce Primary Load**: Free up primary for writes  
✅ **Geographic Distribution**: Place replicas closer to users  
✅ **High Availability**: Replica can be promoted to primary  

---

## Infrastructure Setup

### Option 1: AWS RDS

1. **Create Read Replica:**
   ```bash
   aws rds create-db-instance-read-replica \
     --db-instance-identifier myapp-read-replica \
     --source-db-instance-identifier myapp-primary \
     --db-instance-class db.t3.medium
   ```

2. **Get Replica Endpoint:**
   ```bash
   aws rds describe-db-instances \
     --db-instance-identifier myapp-read-replica \
     --query 'DBInstances[0].Endpoint.Address'
   ```

3. **Add to Environment:**
   ```env
   DATABASE_URL=postgresql://user:pass@primary.rds.amazonaws.com:5432/db
   READ_REPLICA_URL=postgresql://user:pass@replica.rds.amazonaws.com:5432/db
   ```

### Option 2: Google Cloud SQL

1. **Create Replica:**
   ```bash
   gcloud sql instances create myapp-replica \
     --master-instance-name=myapp-primary \
     --tier=db-n1-standard-2
   ```

2. **Get Connection String:**
   ```bash
   gcloud sql instances describe myapp-replica \
     --format='value(connectionName)'
   ```

### Option 3: DigitalOcean

1. Go to Database → Your Database
2. Click "Create Read-Only Node"
3. Copy the replica connection string
4. Add to `.env`

### Option 4: Self-Hosted PostgreSQL

1. **Configure Primary** (`postgresql.conf`):
   ```conf
   wal_level = replica
   max_wal_senders = 3
   wal_keep_size = 64
   ```

2. **Create Replication User:**
   ```sql
   CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'secure_password';
   ```

3. **Setup Replica Server:**
   ```bash
   pg_basebackup -h primary_host -D /var/lib/postgresql/data -U replicator -P -v
   ```

4. **Configure Replica** (`postgresql.conf`):
   ```conf
   hot_standby = on
   ```

5. **Create `standby.signal` file:**
   ```bash
   touch /var/lib/postgresql/data/standby.signal
   ```

---

## Application Configuration

### Environment Variables

Add to `.env`:
```env
# Primary database (writes)
DATABASE_URL=postgresql://user:pass@primary.example.com:5432/ecommerce

# Read replica (reads)
READ_REPLICA_URL=postgresql://user:pass@replica.example.com:5432/ecommerce
```

### Code Usage

The application automatically uses read replicas when configured:

```typescript
import { db, dbRead, executeReadQuery, executeWriteQuery } from './db';

// Automatic read routing
const products = await executeReadQuery(async (database) => {
    return database.select().from(products);
});

// Explicit write routing
const newProduct = await executeWriteQuery(async (database) => {
    return database.insert(products).values({...}).returning();
});

// Force read from primary (for consistency)
const recentOrder = await executeReadQuery(
    async (db) => db.select().from(orders).where(eq(orders.id, orderId)),
    { usePrimary: true }
);
```

---

## Repository Pattern

Update repositories to use read replicas:

```typescript
import { getReadDB, getWriteDB } from '../db';

class ProductRepository {
    // Read operations - use replica
    async findAll() {
        return getReadDB().select().from(products);
    }

    async findById(id: number) {
        return getReadDB()
            .select()
            .from(products)
            .where(eq(products.id, id))
            .limit(1);
    }

    // Write operations - use primary
    async create(data: InsertProduct) {
        return getWriteDB()
            .insert(products)
            .values(data)
            .returning();
    }

    async update(id: number, data: Partial<Product>) {
        return getWriteDB()
            .update(products)
            .set(data)
            .where(eq(products.id, id))
            .returning();
    }
}
```

---

## Monitoring

### Health Check Endpoint

```typescript
import { checkDatabaseHealth } from './db';

app.get('/health/database', async (req, res) => {
    const health = await checkDatabaseHealth();
    
    if (!health.primary) {
        return res.status(503).json({ 
            status: 'unhealthy',
            error: 'Primary database unavailable'
        });
    }

    res.json({
        status: 'healthy',
        primary: health.primary,
        replica: health.replica,
        replicaLagMs: health.replicaLag
    });
});
```

### Replication Lag Monitoring

```typescript
import { checkReplicaLag } from './db';

// Monitor lag every minute
setInterval(async () => {
    const { lagMs, isHealthy } = await checkReplicaLag();
    
    if (!isHealthy) {
        console.warn(`High replication lag: ${lagMs}ms`);
        // Send alert to monitoring service
    }
}, 60000);
```

---

## Best Practices

### When to Use Replicas

✅ **Use Replica for:**
- Product listings
- Search queries
- Analytics queries
- Dashboard data
- Public API reads

❌ **Use Primary for:**
- User session data (immediate consistency needed)
- Order status after creation
- Payment verification
- Any query requiring latest data

### Handling Replication Lag

```typescript
// After creating an order, read from primary for confirmation
const order = await executeWriteQuery(async (db) => {
    return db.insert(orders).values(orderData).returning();
});

// Then fetch confirmation from primary (not replica)
const confirmation = await executeReadQuery(
    async (db) => db.select().from(orders).where(eq(orders.id, order[0].id)),
    { usePrimary: true } // Force primary to avoid lag
);
```

### Connection Pooling

```typescript
// Primary pool (writes)
max: 20 connections

// Replica pool (reads)
max: 30 connections (more reads than writes)
```

---

## Troubleshooting

### 1. Replica Not Replicating

**Check replication status on primary:**
```sql
SELECT * FROM pg_stat_replication;
```

**Check replica status:**
```sql
SELECT pg_last_xact_replay_timestamp();
```

### 2. High Replication Lag

**Causes:**
- Network latency between primary/replica
- Heavy write load on primary
- Slow replay on replica

**Solutions:**
- Upgrade replica instance size
- Reduce write load
- Check network connectivity

### 3. Connection Errors

**Verify connectivity:**
```bash
psql "postgresql://user:pass@replica.example.com:5432/db" -c "SELECT 1"
```

**Check firewall rules:**
- Ensure replica accepts connections from app servers
- Verify security group rules (AWS)

---

## Performance Testing

### Before Replica
```bash
# All queries to primary
ab -n 1000 -c 50 https://api.example.com/api/products
# Result: ~200 req/s
```

### After Replica
```bash
# Reads distributed to replica
ab -n 1000 -c 50 https://api.example.com/api/products
# Result: ~400 req/s (2x improvement)
```

---

## Cost Considerations

**AWS RDS:**
- Replica costs same as primary instance
- Additional storage costs
- No data transfer charges within same region

**Example:** db.t3.medium primary + replica = ~$150/month

**Worth it when:**
- > 1000 concurrent users
- Read:Write ratio > 3:1
- Query latency > 200ms

---

## Migration Checklist

- [ ] Create read replica in cloud provider
- [ ] Add `READ_REPLICA_URL` to environment variables
- [ ] Deploy updated application code
- [ ] Monitor replication lag
- [ ] Update repositories to use `getReadDB()`
- [ ] Test failover scenarios
- [ ] Setup alerting for replication lag > 5s
- [ ] Document replica endpoint for team

---

## Next Steps

1. **Start Small**: Enable replica for product/category queries
2. **Monitor**: Track query performance and lag
3. **Expand**: Gradually move more reads to replica
4. **Optimize**: Identify slow queries and add indexes

🎯 **Expected Result**: 2-3x improvement in read query performance
