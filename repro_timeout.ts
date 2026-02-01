import pg from 'pg';
import "dotenv/config";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
    console.error("No DATABASE_URL");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 2000, // Matching the aggressive setting in db.ts
});

console.log("Attempting connection with 2000ms timeout...");
const start = Date.now();

pool.connect()
    .then(client => {
        console.log(`Connected successfully in ${Date.now() - start}ms`);
        client.release();
        pool.end();
    })
    .catch(err => {
        console.error(`Connection failed after ${Date.now() - start}ms`);
        console.error("Error:", err.message);
        pool.end();
    });
