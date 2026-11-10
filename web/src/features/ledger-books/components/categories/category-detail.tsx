import { useState } from 'react';

import { Pencil } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';

import { LazyDialogTrigger } from '@/components/shared/lazy-trigger/lazy-trigger';

import { formatApiError } from '@/features/fund-sources/api/format-api-error';

import { useUpdateCategory } from '../../api/upsert-categories';

import type { CategoryResponse } from '../../api/get-categories';
import type { CategoryChange } from '../../api/upsert-categories';

const loadEditDialog = () => import('./edit-category-dialog');

type Props = { category: CategoryResponse };

export function EditCategoryButton({ category }: Props) {
  return (
    <LazyDialogTrigger load={loadEditDialog} dialogProps={{ category }}>
      {(triggerProps) => (
        <Button
          {...triggerProps}
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 rounded-full"
          aria-label="Sửa danh mục"
        >
          <Pencil />
        </Button>
      )}
    </LazyDialogTrigger>
  );
}

/** Tag rows (rename in place) and the add-tag form. */
export function CategoryTags({
  category,
  compact,
}: Props & { compact?: boolean }) {
  const { mutate, isPending } = useUpdateCategory();
  const [editingUuid, setEditingUuid] = useState<string>();
  const [editDraft, setEditDraft] = useState('');
  const [newTag, setNewTag] = useState('');
  const px = compact ? 'px-4' : 'px-6';

  const save = (change: CategoryChange, onDone: () => void) =>
    mutate(
      { category, change },
      {
        onSuccess: onDone,
        onError: (error) =>
          toast.add({
            type: 'error',
            title: 'Không thể lưu thay đổi',
            description: formatApiError(error, 'Vui lòng thử lại.').message,
          }),
      },
    );

  const startEdit = (uuid: string, name: string) => {
    setEditingUuid(uuid);
    setEditDraft(name);
  };

  const commitEdit = (uuid: string, current: string) => {
    const name = editDraft.trim();
    if (!name || name === current) {
      setEditingUuid(undefined);
      return;
    }
    save({ type: 'renameTag', tagUuid: uuid, name }, () =>
      setEditingUuid(undefined),
    );
  };

  const addTag = () => {
    const name = newTag.trim();
    if (!name) return;
    save({ type: 'addTag', name }, () => setNewTag(''));
  };

  return (
    <>
      <ul className="divide-y">
        {category.sub_categories.map((tag) => (
          <li key={tag.uuid} className={`flex items-center gap-3 py-3 ${px}`}>
            {editingUuid === tag.uuid ? (
              <Input
                autoFocus
                value={editDraft}
                disabled={isPending}
                aria-label="Tên thẻ"
                className="h-9 max-w-xs"
                onChange={(e) => setEditDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit(tag.uuid, tag.name);
                  if (e.key === 'Escape') setEditingUuid(undefined);
                }}
                onBlur={() => commitEdit(tag.uuid, tag.name)}
              />
            ) : (
              <>
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary ring-primary/20 h-7 ring-1 ring-inset"
                >
                  {tag.name}
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="ml-auto rounded-full"
                  aria-label={`Sửa thẻ ${tag.name}`}
                  onClick={() => startEdit(tag.uuid, tag.name)}
                >
                  <Pencil />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>

      <form
        className={`flex items-center gap-3 border-t py-3 ${px}`}
        onSubmit={(e) => {
          e.preventDefault();
          addTag();
        }}
      >
        <Input
          value={newTag}
          disabled={isPending}
          placeholder="Nhập tên thẻ mới…"
          aria-label="Tên thẻ mới"
          className="h-10"
          onChange={(e) => setNewTag(e.target.value)}
        />
        <Button type="submit" disabled={isPending || !newTag.trim()}>
          Thêm
        </Button>
      </form>
    </>
  );
}

export default function CategoryDetail({ category }: Props) {
  return (
    <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
      <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-xl font-bold">{category.name}</h2>
            <EditCategoryButton category={category} />
          </div>
          {category.description && (
            <p className="text-muted-foreground mt-1">{category.description}</p>
          )}
        </div>
        <Badge variant="outline" className="shrink-0">
          {category.sub_categories.length} thẻ
        </Badge>
      </div>

      <div className="bg-muted/50 border-y px-6 py-3 text-sm font-medium">
        Thẻ (danh mục con)
      </div>

      <CategoryTags category={category} />
    </div>
  );
}
