import { Link } from '@tanstack/react-router';

import {
  cachedCategories,
  nameOf,
  same,
  useCategories,
} from './category-lookup';
import Picker, { pickerColumnOptions } from './picker';

import type { LedgerEntryRow } from '../post-journal-entries-schema';
import type { CellProps, Column } from 'react-datasheet-grid';

const CategoryCell = ({
  rowData,
  setRowData,
  focus,
  stopEditing,
  rowIndex,
  columnIndex,
}: CellProps<LedgerEntryRow, unknown>) => {
  const categories = useCategories() ?? [];
  return (
    <Picker
      focus={focus}
      stopEditing={stopEditing}
      rowIndex={rowIndex}
      columnIndex={columnIndex}
      value={rowData.categoryUuid}
      options={categories}
      placeholder="Tìm danh mục…"
      emptyText={
        categories.length === 0 ? (
          <>
            Chưa có danh mục.{' '}
            <Link to="/ledger-books/categories" className="text-primary">
              Tạo danh mục
            </Link>
          </>
        ) : (
          'Không tìm thấy danh mục'
        )
      }
      onPick={(uuid) => {
        const keepTag = categories
          .find((c) => c.uuid === uuid)
          ?.sub_categories.some((t) => t.uuid === rowData.tagUuid);
        setRowData({
          ...rowData,
          categoryUuid: uuid,
          tagUuid: keepTag ? rowData.tagUuid : '',
        });
      }}
    />
  );
};

export const categoryColumn: Partial<Column<LedgerEntryRow, unknown, string>> =
  {
    ...pickerColumnOptions,
    component: CategoryCell,
    copyValue: ({ rowData }) =>
      nameOf(rowData.categoryUuid, cachedCategories()),
    pasteValue: ({ rowData, value }) => {
      const match = cachedCategories().find((c) => same(c.name, value));
      return { ...rowData, categoryUuid: match?.uuid ?? '', tagUuid: '' };
    },
    deleteValue: ({ rowData }) => ({
      ...rowData,
      categoryUuid: '',
      tagUuid: '',
    }),
    isCellEmpty: ({ rowData }) => !rowData.categoryUuid,
  };
