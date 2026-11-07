import Stepper from './stepper';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'Shared/Stepper',
  component: Stepper,
  tags: ['autodocs'],
  args: {
    steps: [
      { title: 'Ghi bút toán', hint: 'Đã đóng', state: 'done' },
      { title: 'Đối soát', hint: 'Đang kiểm tra số dư', state: 'current' },
      { title: 'Báo cáo', hint: 'Chưa tạo', state: 'todo' },
    ],
  },
  decorators: [
    (Story) => (
      <div className="text-foreground flex flex-col gap-5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllDone: Story = {
  args: {
    steps: [
      { title: 'Ghi bút toán', hint: 'Hoàn tất', state: 'done' },
      { title: 'Đối soát', hint: 'Tất cả đã khớp', state: 'done' },
      { title: 'Báo cáo', hint: 'Đã tạo', state: 'done' },
    ],
  },
};
