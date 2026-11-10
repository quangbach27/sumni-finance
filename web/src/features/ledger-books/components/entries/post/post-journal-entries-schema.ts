import { z } from 'zod';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** A row counts as an entry once it has an amount. */
export const isFilled = (row: { inflow: number; outflow: number }) =>
  row.inflow > 0 || row.outflow > 0;

const entryRowSchema = z
  .object({
    /** `YYYY-MM-DD`. */
    date: z.string(),
    /** Category uuid, or empty. */
    categoryUuid: z.string(),
    /** Tag (sub-category) uuid, or empty. */
    tagUuid: z.string(),
    description: z.string(),
    /** Nợ: inflow, adds to the fund source. */
    inflow: z.number(),
    /** Có: outflow, subtracts from the fund source. */
    outflow: z.number(),
  })
  .superRefine((row, ctx) => {
    const filled = isFilled(row);
    const hasDescription = row.description.trim() !== '';

    if (filled && !hasDescription) {
      ctx.addIssue({
        code: 'custom',
        path: ['description'],
        message: 'Vui lòng nhập diễn giải',
      });
    }
    if (filled && !DATE_PATTERN.test(row.date)) {
      ctx.addIssue({
        code: 'custom',
        path: ['date'],
        message: 'Vui lòng chọn ngày',
      });
    }
    if (filled && !row.categoryUuid) {
      ctx.addIssue({
        code: 'custom',
        path: ['categoryUuid'],
        message: 'Vui lòng chọn danh mục',
      });
    }
    if (!filled && hasDescription) {
      ctx.addIssue({
        code: 'custom',
        path: ['inflow'],
        message: 'Chưa nhập số tiền',
      });
    }
  });

export const ledgerEntriesFormSchema = z.object({
  fundSourceUuid: z.string().min(1, 'Vui lòng chọn nguồn quỹ'),
  rows: z.array(entryRowSchema),
});

export type LedgerEntryRow = z.infer<typeof entryRowSchema>;
export type LedgerEntriesFormValues = z.infer<typeof ledgerEntriesFormSchema>;
