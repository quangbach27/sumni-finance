import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type StatCardSkeletonProps = {
  className?: string;
};

export default function StatCardSkeleton({ className }: StatCardSkeletonProps) {
  return (
    <Card className={className}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
    </Card>
  );
}
