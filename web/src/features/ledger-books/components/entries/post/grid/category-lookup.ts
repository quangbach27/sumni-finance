import { useQuery } from '@tanstack/react-query';

import { queryClient } from '@/lib/query';

import { getCategoriesQueryOptions } from '../../../../api/get-categories';

import type { CategoryResponse } from '../../../../api/get-categories';

export type Option = { uuid: string; name: string };

export const useCategories = () =>
  useQuery(getCategoriesQueryOptions()).data?.items;

/** Categories already in the query cache (for copy/paste, outside React). */
export const cachedCategories = (): CategoryResponse[] =>
  queryClient.getQueryData(getCategoriesQueryOptions().queryKey)?.items ?? [];

export const same = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

export const nameOf = (uuid: string, options: Option[]) =>
  options.find((o) => o.uuid === uuid)?.name ?? '';
