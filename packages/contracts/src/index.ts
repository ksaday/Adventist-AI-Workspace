// packages/contracts - Shared Zod contracts across client and server
import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'ready', 'degraded']),
  timestamp: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
