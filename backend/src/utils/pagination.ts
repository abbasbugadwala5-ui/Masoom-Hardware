import { z } from 'zod';

export const pageQuerySchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  q:        z.string().optional(),
  sort:     z.string().optional(),
  order:    z.enum(['asc', 'desc']).default('desc'),
});

export type PageQuery = z.infer<typeof pageQuerySchema>;

export function paginate<T>(rows: T[], total: number, page: number, pageSize: number) {
  return {
    data: rows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}
