import StatusAlert from './status-alert';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'Shared/StatusAlert',
  component: StatusAlert,
  tags: ['autodocs'],
  args: {
    variant: 'success',
    title: 'Thêm nguồn quỹ thành công',
    children: 'Đã thêm nguồn quỹ "Huynh Trang · Tiền mặt".',
    onDismiss: () => {},
  },
  argTypes: {
    variant: { control: 'radio', options: ['success', 'destructive'] },
  },
  decorators: [
    (Story) => (
      <div className="w-[480px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StatusAlert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    title: 'Không thể thêm nguồn quỹ',
    children: (
      <>
        Vui lòng thử lại.
        <ul className="mt-1 list-disc pl-4">
          <li>Tên nguồn quỹ đã tồn tại.</li>
        </ul>
      </>
    ),
  },
};

export const WithoutDismiss: Story = { args: { onDismiss: undefined } };
