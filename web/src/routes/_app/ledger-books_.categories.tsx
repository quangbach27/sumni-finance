import { createFileRoute } from '@tanstack/react-router';

import ContentLayout from '@/components/layout/content-layout/content-layout';

import CategoriesPage from '@/features/ledger-books/components/categories/categories-page';
import CreateCategoriesTrigger from '@/features/ledger-books/components/categories/create-categories-trigger';

export const Route = createFileRoute('/_app/ledger-books_/categories')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <ContentLayout
      title="Danh mục và thẻ"
      description="Danh mục và thẻ dùng cho mọi kỳ sổ. Đổi tên cập nhật ở các bút toán đã ghi, không làm đổi số tiền hay số dư"
      additionalContent={<CreateCategoriesTrigger />}
    >
      <CategoriesPage />
    </ContentLayout>
  );
}
