import { useState } from 'react';

import DatePicker from './date-picker';

import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'Shared/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
  args: { value: '2026-11-01', onChange: () => {} },
  decorators: [
    (Story) => (
      <div className="text-foreground w-64">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

const Controlled = (args: React.ComponentProps<typeof DatePicker>) => {
  const [value, setValue] = useState(args.value);
  return <DatePicker {...args} value={value} onChange={setValue} />;
};

export const Default: Story = { render: (args) => <Controlled {...args} /> };
export const Empty: Story = {
  args: { value: '' },
  render: (args) => <Controlled {...args} />,
};
export const Invalid: Story = {
  args: { invalid: true },
  render: (args) => <Controlled {...args} />,
};
