import { Plus } from 'lucide-react';

import {
  cachedCategories,
  nameOf,
  same,
  useCategories,
} from './category-lookup';
import Picker, { pickerColumnOptions } from './picker';
import { useCreateTag } from './use-create-tag';

import type { LedgerEntryRow } from '../post-journal-entries-schema';
import type { CellProps, Column } from 'react-datasheet-grid';

const TagCell = ({
  rowData,
  setRowData,
  focus,
  stopEditing,
  rowIndex,
  columnIndex,
}: CellProps<LedgerEntryRow, unknown>) => {
  const category = useCategories()?.find(
    (c) => c.uuid === rowData.categoryUuid,
  );
  const { createTag, isPending } = useCreateTag(category);

  const createAndPick = async (name: string, close: () => void) => {
    const { created, tagUuid } = await createTag(name);
    if (tagUuid) setRowData({ ...rowData, tagUuid });
    if (created) close();
  };

  return (
    <Picker
      focus={focus}
      stopEditing={stopEditing}
      rowIndex={rowIndex}
      columnIndex={columnIndex}
      disabled={!category}
      value={rowData.tagUuid}
      options={category?.sub_categories ?? []}
      placeholder={`Tìm thẻ của ${category?.name ?? ''}…`}
      emptyText="Không tìm thấy thẻ"
      onPick={(uuid) => setRowData({ ...rowData, tagUuid: uuid })}
      footer={(search, close) => (
        <button
          type="button"
          disabled={isPending || !search.trim()}
          onClick={() => void createAndPick(search, close)}
          className="text-primary hover:bg-muted flex w-full items-center gap-2 border-t px-3 py-2 text-sm disabled:opacity-50"
        >
          <Plus className="size-4" />
          {search.trim() ? `Tạo thẻ "${search.trim()}"` : 'Tạo thẻ mới'}
        </button>
      )}
    />
  );
};

const tagsOf = (categoryUuid: string) =>
  cachedCategories().find((c) => c.uuid === categoryUuid)?.sub_categories ?? [];

export const tagColumn: Partial<Column<LedgerEntryRow, unknown, string>> = {
  ...pickerColumnOptions,
  component: TagCell,
  copyValue: ({ rowData }) =>
    nameOf(rowData.tagUuid, tagsOf(rowData.categoryUuid)),
  pasteValue: ({ rowData, value }) => {
    const match = tagsOf(rowData.categoryUuid).find((t) => same(t.name, value));
    return { ...rowData, tagUuid: match?.uuid ?? '' };
  },
  deleteValue: ({ rowData }) => ({ ...rowData, tagUuid: '' }),
  isCellEmpty: ({ rowData }) => !rowData.tagUuid,
};
