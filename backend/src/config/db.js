import { EventEmitter } from 'events';
import { PrismaClient } from '../../generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg(process.env.DATABASE_URL);
export const prisma = new PrismaClient({ adapter });

// Re-export from the central service so callers can do `import db from
// './db.js'` and get all the booking / user / doctor helpers.
import * as services from './services.js';

export default {
    prisma,
    ...services,
};
