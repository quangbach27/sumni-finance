import { toast } from '@/components/ui/toast';

import { formatApiError } from '@/features/fund-sources/api/format-api-error';

import { useUpdateCategory } from '../../../../api/upsert-categories';
import { cachedCategories, same } from './category-lookup';

import type { CategoryResponse } from '../../../../api/get-categories';

type CreateTagResult = { created: boolean; tagUuid?: string };

/**
 * Adds a tag to `category`. `created` is false (after a toast) when the
 * request failed; `tagUuid` is the new tag once the category cache has it.
 */
export function useCreateTag(category: CategoryResponse | undefined) {
  const { mutateAsync, isPending } = useUpdateCategory();

  const createTag = async (name: string): Promise<CreateTagResult> => {
    if (!category) return { created: false };
    try {
      await mutateAsync({ category, change: { type: 'addTag', name } });
      const tagUuid = cachedCategories()
        .find((c) => c.uuid === category.uuid)
        ?.sub_categories.find((t) => same(t.name, name))?.uuid;
      return { created: true, tagUuid };
    } catch (error) {
      toast.add({
        type: 'error',
        title: formatApiError(error, 'Không thể tạo thẻ').message,
      });
      return { created: false };
    }
  };

  return { createTag, isPending };
}
