import { z } from 'zod';

const schema = z.object({
  VITE_API_BASE_URL: z.url().default('http://localhost:4000'),
});

const parsed = schema.safeParse(import.meta.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', z.treeifyError(parsed.error));
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
