import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./tests/setup.ts'],
        fileParallelism: false, // Run test files one at a time to prevent DB conflicts
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/**',
                'dist/**',
                '**/*.config.*',
                '**/types/**',
                'tests/**'
            ]
        },
        testTimeout: 10000,
        env: {
            DATABASE_URL: 'postgresql://postgres.tvhxmrrpuiqpzrtclgmt:JoyHarami96@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
            TEST_DATABASE_URL: 'postgresql://postgres.tvhxmrrpuiqpzrtclgmt:JoyHarami96@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
            NODE_ENV: 'test'
        },
        server: {
            deps: {
                inline: ['isomorphic-dompurify']
            }
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './server'),
            '@shared': path.resolve(__dirname, './shared'),
            '@server': path.resolve(__dirname, './server')
        }
    }
});
