import { Ban, Eye } from 'lucide-react';

import RowActionsMenu from './row-actions-menu';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'Shared/RowActionsMenu',
  component: RowActionsMenu,
  tags: ['autodocs'],
  args: {
    actions: [
      { key: 'view', label: 'Xem chi tiết', icon: Eye, onSelect: () => {} },
      {
        key: 'cancel',
        label: 'Hủy bút toán',
        icon: Ban,
        onSelect: () => {},
        destructive: true,
      },
    ],
  },
} satisfies Meta<typeof RowActionsMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithDestructive: Story = {};

export const ViewOnly: Story = {
  args: {
    actions: [
      { key: 'view', label: 'Xem chi tiết', icon: Eye, onSelect: () => {} },
    ],
  },
};
