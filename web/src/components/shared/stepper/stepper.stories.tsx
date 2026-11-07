import { useState } from 'react';

import Stepper from './stepper';

import type { Step } from './stepper';
import type { Meta, StoryObj } from '@storybook/react-vite';

const steps: Step[] = [
  { id: 'record', title: 'Ghi bút toán', hint: 'Đã đóng', state: 'done' },
  {
    id: 'reconcile',
    title: 'Đối soát',
    hint: 'Đang kiểm tra số dư',
    state: 'current',
  },
  { id: 'report', title: 'Báo cáo', hint: 'Chưa tạo', state: 'todo' },
];

const meta = {
  title: 'Shared/Stepper',
  component: Stepper,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: { steps },
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

/** Below 768px the compact progress bar is rendered. */
export const Mobile: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};

export const Desktop: Story = {
  globals: { viewport: { value: 'desktop', isRotated: false } },
};

export const AllDone: Story = {
  args: {
    steps: [
      { title: 'Ghi bút toán', hint: 'Hoàn tất', state: 'done' },
      { title: 'Đối soát', hint: 'Tất cả đã khớp', state: 'done' },
      { title: 'Báo cáo', hint: 'Đã tạo', state: 'done' },
    ],
  },
};

/** The last confirm of the step failed: `aria-invalid` styles it as destructive. */
export const Invalid: Story = {
  args: {
    steps: steps.map((s) =>
      s.id === 'reconcile' ? { ...s, invalid: true } : s,
    ),
  },
};

export const InvalidMobile: Story = {
  ...Invalid,
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};

function SelectableDemo() {
  const [selectedId, setSelectedId] = useState('reconcile');
  return (
    <Stepper steps={steps} selectedId={selectedId} onSelect={setSelectedId} />
  );
}

/** Done and current steps can be selected. */
export const Selectable: Story = { render: () => <SelectableDemo /> };
