import { useEffect } from 'react';

import { useForm } from 'react-hook-form';

import FormField from './form-field';
import TextInput from './text-input';

import type { Meta, StoryObj } from '@storybook/react-vite';

type Values = { name: string };

function Demo({
  label,
  description,
  withError,
}: {
  label: string;
  description?: string;
  withError?: boolean;
}) {
  const form = useForm<Values>({ defaultValues: { name: '' } });
  const { setError } = form;
  useEffect(() => {
    if (withError) setError('name', { message: 'Vui lòng nhập tên.' });
  }, [withError, setError]);
  return (
    <FormField
      control={form.control}
      name="name"
      label={label}
      description={description}
      Component={TextInput}
      autoComplete="off"
    />
  );
}

const meta = {
  title: 'Shared/FormField',
  component: Demo,
  tags: ['autodocs'],
  args: { label: 'Tên kỳ' },
  decorators: [
    (Story) => (
      <div className="w-[360px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithDescription: Story = {
  args: { description: 'Tên hiển thị trong danh sách kỳ.' },
};

export const WithError: Story = { args: { withError: true } };
