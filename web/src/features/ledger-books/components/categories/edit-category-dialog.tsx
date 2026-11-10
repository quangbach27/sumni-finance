import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';

import StatusAlertOutlet from '@/components/shared/status-alert/status-alert-outlet';
import {
  StatusAlertProvider,
  useStatusAlertActions,
} from '@/components/shared/status-alert/status-alert-provider';

import { formatApiError } from '@/features/fund-sources/api/format-api-error';

import { useUpdateCategory } from '../../api/upsert-categories';

import type { CategoryResponse } from '../../api/get-categories';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryResponse;
};

export default function EditCategoryDialog(props: Props) {
  return (
    <StatusAlertProvider>
      <EditCategoryDialogContent {...props} />
    </StatusAlertProvider>
  );
}

function EditCategoryDialogContent({ open, onOpenChange, category }: Props) {
  const { mutate, isPending } = useUpdateCategory();
  const { showAlert, dismissAlert } = useStatusAlertActions();
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description ?? '');

  useEffect(() => {
    if (open) {
      setName(category.name);
      setDescription(category.description ?? '');
      dismissAlert();
    }
    // Reset only when the dialog opens.
  }, [open]);

  const submit = () => {
    if (!name.trim()) {
      showAlert({
        variant: 'destructive',
        title: 'Không thể lưu danh mục',
        message: 'Vui lòng nhập tên danh mục.',
      });
      return;
    }
    mutate(
      { category, change: { type: 'category', name, description } },
      {
        onSuccess: () => {
          toast.add({ type: 'success', title: 'Đã cập nhật danh mục.' });
          onOpenChange(false);
        },
        onError: (error) => {
          const { message, details } = formatApiError(
            error,
            'Không thể lưu danh mục. Vui lòng thử lại.',
          );
          showAlert({
            variant: 'destructive',
            title: 'Không thể lưu danh mục',
            message,
            details,
          });
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sửa danh mục</DialogTitle>
          <DialogDescription>
            Đổi tên cập nhật ở các bút toán đã ghi, không làm đổi số tiền.
          </DialogDescription>
        </DialogHeader>
        <form
          id="edit-category-form"
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <StatusAlertOutlet />
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-category-name">Tên danh mục</Label>
            <Input
              id="edit-category-name"
              value={name}
              autoComplete="off"
              className="h-10"
              onChange={(e) => {
                setName(e.target.value);
                dismissAlert();
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-category-description">
              Mô tả{' '}
              <span className="text-muted-foreground">không bắt buộc</span>
            </Label>
            <Input
              id="edit-category-description"
              value={description}
              autoComplete="off"
              className="h-10"
              onChange={(e) => {
                setDescription(e.target.value);
                dismissAlert();
              }}
            />
          </div>
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button type="submit" form="edit-category-form" disabled={isPending}>
            {isPending ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
