import type { FundSource } from '../../api/types';
import type { LucideIcon } from 'lucide-react';
import type { ComponentType, LazyExoticComponent } from 'react';

export type FundSourceActionDialogProps = {
  fundSource: FundSource;
  onClose: () => void;
};

export type FundSourceAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  variant?: 'default' | 'destructive';
  /** Which fund sources show this action. Defaults to all. */
  isVisible?: (item: FundSource) => boolean;
  /** Returns a reason (or `true`) when the action is disabled for the item. */
  getDisabledReason?: (item: FundSource) => string | true | undefined;
  /** Opens a lazily loaded dialog when selected. */
  Dialog?: LazyExoticComponent<ComponentType<FundSourceActionDialogProps>>;
  /** Runs inline when selected (no dialog). */
  onSelect?: (item: FundSource) => void;
};

/** Groups are rendered in order, separated by a divider. */
export type FundSourceActionGroup = FundSourceAction[];
