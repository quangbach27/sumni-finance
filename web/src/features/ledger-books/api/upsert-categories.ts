import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { http } from '@/lib/clients';

import { CATEGORIES_URL } from './get-categories';

import type { CategoryResponse } from './get-categories';
import type { components } from '@/features/generated/ledgers.gen';

type Schemas = components['schemas'];
export type UpsertCategoriesRequest = Schemas['UpsertCategoriesRequest'];
export type UpsertCategoriesResponse = Schemas['UpsertCategoriesResponse'];

const norm = (s: string) => s.trim().toLowerCase();

const hasDuplicate = (names: string[]) =>
  new Set(names.map(norm)).size !== names.length;

export const categoryRowSchema = z.object({
  name: z.string(),
  description: z.string(),
  /** Sub-categories. */
  tags: z.array(z.string()),
});

export const createCategoriesSchema = z
  .object({ rows: z.array(categoryRowSchema) })
  .superRefine(({ rows }, ctx) => {
    const seen = new Set<string>();
    rows.forEach((row, i) => {
      const name = row.name.trim();
      if (!name && (row.tags.length > 0 || row.description.trim())) {
        ctx.addIssue({
          code: 'custom',
          path: ['rows', i, 'name'],
          message: 'Vui lòng nhập tên danh mục',
        });
      }
      if (name) {
        if (seen.has(norm(name))) {
          ctx.addIssue({
            code: 'custom',
            path: ['rows', i, 'name'],
            message: 'Tên danh mục bị trùng',
          });
        }
        seen.add(norm(name));
      }
      if (hasDuplicate(row.tags)) {
        ctx.addIssue({
          code: 'custom',
          path: ['rows', i, 'tags'],
          message: 'Tên thẻ bị trùng',
        });
      }
    });
  });

export type CategoryRow = z.infer<typeof categoryRowSchema>;
export type CreateCategoriesFormValues = z.infer<typeof createCategoriesSchema>;

export const emptyCategoryRow = (): CategoryRow => ({
  name: '',
  description: '',
  tags: [],
});

export const isBlankRow = (row: CategoryRow) =>
  !row.name.trim() && !row.description.trim() && row.tags.length === 0;

/** Rows that will be sent: blank rows are skipped. */
export const filledRows = (rows: CategoryRow[]) =>
  rows.filter((r) => !isBlankRow(r));

export const countCategories = (rows: CategoryRow[]) => {
  const filled = filledRows(rows);
  return {
    categories: filled.length,
    tags: filled.reduce((sum, r) => sum + r.tags.length, 0),
  };
};

export const toUpsertCategoriesRequest = (
  rows: CategoryRow[],
): UpsertCategoriesRequest => ({
  categories: filledRows(rows).map((r) => ({
    name: r.name.trim(),
    description: r.description.trim() || undefined,
    sub_categories: r.tags.map((t) => ({ name: t.trim() })),
  })),
});

const putCategories = (request: UpsertCategoriesRequest) =>
  http.put<UpsertCategoriesResponse, UpsertCategoriesRequest>(
    CATEGORIES_URL,
    request,
  );

const upsertCategories = (rows: CategoryRow[]) =>
  putCategories(toUpsertCategoriesRequest(rows));

export type CategoryChange =
  | { type: 'category'; name: string; description: string }
  | { type: 'renameTag'; tagUuid: string; name: string }
  | { type: 'addTag'; name: string };

type UpdateCategoryInput = {
  category: CategoryResponse;
  change: CategoryChange;
};

/**
 * The upsert overwrites name and description, so every update resends the
 * category's current values along with the one change.
 */
export const toUpdateCategoryRequest = ({
  category,
  change,
}: UpdateCategoryInput): UpsertCategoriesRequest => {
  const base = { uuid: category.uuid, name: category.name } as {
    uuid: string;
    name: string;
    description?: string;
    sub_categories?: { uuid?: string; name: string }[];
  };
  base.description = category.description;

  switch (change.type) {
    case 'category':
      base.name = change.name.trim();
      base.description = change.description.trim() || undefined;
      break;
    case 'renameTag':
      base.sub_categories = [
        { uuid: change.tagUuid, name: change.name.trim() },
      ];
      break;
    case 'addTag':
      base.sub_categories = [{ name: change.name.trim() }];
      break;
  }
  return { categories: [base] };
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCategoryInput) =>
      putCategories(toUpdateCategoryRequest(input)),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_URL] }),
  });
};

export const useUpsertCategories = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: upsertCategories,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_URL] }),
  });
};
