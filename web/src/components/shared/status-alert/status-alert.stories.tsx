import { Button } from '@/components/ui/button';

import StatusAlert from './status-alert';
import StatusAlertOutlet from './status-alert-outlet';
import { StatusAlertProvider, useStatusAlert } from './status-alert-provider';

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

function InlineDemo() {
  const { showAlert } = useStatusAlert();
  return (
    <div className="flex w-[480px] flex-col gap-4">
      <StatusAlertOutlet />
      <div className="flex gap-3">
        <Button
          onClick={() =>
            showAlert({
              variant: 'success',
              title: 'Thêm nguồn quỹ thành công',
              message: 'Đã thêm nguồn quỹ "Huynh Trang · Tiền mặt".',
            })
          }
        >
          Show success
        </Button>
        <Button
          variant="destructive"
          onClick={() =>
            showAlert({
              variant: 'destructive',
              title: 'Không thể thêm nguồn quỹ',
              message: 'Vui lòng thử lại.',
              details: ['Tên nguồn quỹ đã tồn tại.'],
            })
          }
        >
          Show error
        </Button>
      </div>
    </div>
  );
}

/** `useStatusAlert().showAlert` sets the status; `StatusAlertOutlet` renders it where mounted. */
export const Inline: Story = {
  render: () => (
    <StatusAlertProvider>
      <InlineDemo />
    </StatusAlertProvider>
  ),
};
