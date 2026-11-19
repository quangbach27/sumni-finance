import { Fragment } from 'react';

import { useNavigate } from '@tanstack/react-router';
import { MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { LazyDialogTrigger } from '@/components/shared/lazy-trigger/lazy-trigger';

import { getFundSourceActionGroups } from './actions/fund-source-actions';

import type { FundSource } from '../api/types';
import type { FundSourceActionDialogProps } from './actions/types';
import type { ComponentType } from 'react';

const loadAccountants = () =>
  import('./actions/accountants/accountants-action-dialog') as Promise<{
    default: ComponentType<FundSourceActionDialogProps>;
  }>;
const loadVietQr = () => import('./actions/vietqr/vietqr-action-dialog');

type FundSourceActionsMenuProps = { item: FundSource };

// The dialogs are rendered by LazyDialogTrigger *around* the menu: the menu
// content unmounts on close and would take an inner dialog down with it.
export default function FundSourceActionsMenu({
  item,
}: FundSourceActionsMenuProps) {
  const navigate = useNavigate();
  const dialogProps = { fundSource: item };

  return (
    <LazyDialogTrigger load={loadAccountants} dialogProps={dialogProps}>
      {(accountants) => (
        <LazyDialogTrigger load={loadVietQr} dialogProps={dialogProps}>
          {(vietQr) => {
            const groups = getFundSourceActionGroups({
              item,
              navigate,
              vietQr,
              accountants,
            })
              .map((group) => group.filter((action) => !action.hidden))
              .filter((group) => group.length > 0);

            return (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" aria-label="Tùy chọn" />
                  }
                >
                  <MoreHorizontal />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>{item.name}</DropdownMenuLabel>
                  </DropdownMenuGroup>
                  {groups.map((group, index) => (
                    <Fragment key={index}>
                      <DropdownMenuSeparator />
                      {group.map((action) => {
                        const Icon = action.icon;
                        return (
                          <DropdownMenuItem
                            key={action.id}
                            variant={action.variant}
                            disabled={
                              !action.onSelect || Boolean(action.disabledReason)
                            }
                            {...action.triggerProps}
                            onClick={action.onSelect}
                          >
                            <Icon />
                            <span className="flex flex-col">
                              {action.label}
                              {typeof action.disabledReason === 'string' && (
                                <span className="text-muted-foreground text-xs">
                                  {action.disabledReason}
                                </span>
                              )}
                            </span>
                          </DropdownMenuItem>
                        );
                      })}
                    </Fragment>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }}
        </LazyDialogTrigger>
      )}
    </LazyDialogTrigger>
  );
}
