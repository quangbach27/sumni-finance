import { queryOptions } from '@tanstack/react-query';

import { http } from '@/lib/clients';

import type { components } from '@/features/generated/ledgers.gen';

type Schemas = components['schemas'];
export type ListCategoriesResponse = Schemas['ListCategoriesResponse'];
export type CategoryResponse = Schemas['Category'];

export const CATEGORIES_URL = '/api/v1/categories';

export const getCategoriesQueryOptions = () =>
  queryOptions({
    queryKey: [CATEGORIES_URL],
    queryFn: ({ signal }) =>
      http.get<ListCategoriesResponse>(CATEGORIES_URL, { signal }),
  });
