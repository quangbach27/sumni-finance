import { useAuth } from '@clerk/react';
import { Link } from '@tanstack/react-router';
import { BookOpenIcon } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';

import { cn } from '@/lib/utils';

export default function LandingPage() {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <span className="bg-primary text-accent rounded-xl p-3">
        <BookOpenIcon className="size-8" />
      </span>
      <h1 className="text-3xl font-bold">Tài Chính Sumni</h1>
      <p className="text-muted-foreground max-w-md">
        Quản lý nguồn quỹ, sổ cái và báo cáo tài chính.
      </p>
      {isLoaded && isSignedIn && (
        <Link to="/ledger-books" className={cn(buttonVariants({ size: 'lg' }))}>
          Xem sổ cái
        </Link>
      )}
      {isLoaded && !isSignedIn && (
        <>
          <Link
            to="/sign-in/$"
            params={{ _splat: '' }}
            className={cn(buttonVariants({ size: 'lg' }))}
          >
            Đăng nhập
          </Link>
          <p className="text-muted-foreground text-sm">
            Chưa có tài khoản? Vui lòng liên hệ quản trị viên để được cấp quyền
            truy cập.
          </p>
        </>
      )}
    </main>
  );
}
