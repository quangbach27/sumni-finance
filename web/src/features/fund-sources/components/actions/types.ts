import type { FundSource } from '../../api/types';
import type { LazyDialogProps } from '@/components/shared/lazy-trigger/lazy-trigger';

export type FundSourceActionDialogProps = LazyDialogProps & {
  fundSource: FundSource;
};
