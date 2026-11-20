import { Link } from '@tanstack/react-router';

import { buttonVariants } from '@/components/ui/button';

/** Full-page 404 shown when no route matches. */
export default function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-lg font-semibold">Không tìm thấy trang</h1>
      <p className="text-muted-foreground text-sm">
        Trang bạn tìm không tồn tại hoặc đã được di chuyển.
      </p>
      <Link
        to="/"
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        Về trang chủ
      </Link>
    </div>
  );
}
