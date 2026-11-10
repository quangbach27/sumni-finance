import { Button } from '@/components/ui/button';

import { LazyDialogTrigger } from './lazy-trigger';

import type LazyTriggerDemoDialog from './lazy-trigger-demo-dialog';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';

type DemoProps = ComponentProps<typeof LazyTriggerDemoDialog>;

const load = () => import('./lazy-trigger-demo-dialog');

const meta = {
  title: 'Shared/LazyDialogTrigger',
  component: LazyDialogTrigger<DemoProps>,
  tags: ['autodocs'],
  args: {
    load,
    children: (triggerProps) => <Button {...triggerProps}>Mở dialog</Button>,
  },
} satisfies Meta<typeof LazyDialogTrigger<DemoProps>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithDialogProps: Story = {
  args: {
    dialogProps: { title: 'Tiêu đề tùy chỉnh' },
    children: (triggerProps) => (
      <Button {...triggerProps}>Mở dialog tùy chỉnh</Button>
    ),
  },
};
