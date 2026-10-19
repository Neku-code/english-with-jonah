import { config } from 'dotenv';

// Match Vite's local-file precedence. Process-injected variables always win.
// Neon deploy uses .env.local unless an existing .env was selected.
config({ path: ['.env.local', '.env'], quiet: true });
