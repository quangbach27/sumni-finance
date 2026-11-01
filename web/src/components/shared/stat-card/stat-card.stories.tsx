import StatCard from './stat-card';
import StatCardSkeleton from './stat-card-skeleton';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'Shared/StatCard',
  component: StatCard,
  tags: ['autodocs'],
  args: {
    label: 'Vietcombank · VCB',
    value: '32.640.000',
    variant: 'default',
  },
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    variant: { control: 'radio', options: ['default', 'primary'] },
  },
  decorators: [
    (Story) => (
      <div className="text-foreground w-64">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Primary: Story = {
  args: { label: 'Tổng số dư', value: '48.250.000 ₫', variant: 'primary' },
};

export const Skeleton: Story = {
  render: () => <StatCardSkeleton />,
};
