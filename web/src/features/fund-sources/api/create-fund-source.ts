import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { http } from '@/lib/clients';

import { FUND_SOURCES_URL } from './get-fund-sources';

import type {
  CreateFundSourceRequest,
  CreateFundSourceResponse,
  FundSourceType,
} from './types';

const CREATE_FUND_SOURCE_URL = '/api/v1/fund-sources';

const baseFields = {
  name: z.string().trim().min(1, 'Vui lòng nhập tên nguồn quỹ'),
  owner_name: z.string().trim().min(1, 'Vui lòng nhập tên'),
  balance: z.number().min(0, 'Số dư không được âm'),
};

const bankSchema = z.object({
  ...baseFields,
  type: z.literal('bank'),
  code: z.string().min(1, 'Vui lòng chọn ngân hàng'),
  bin: z.number().int().positive(),
  short_name: z.string(),
  account_number: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập số tài khoản')
    .regex(/^\d+$/, 'Số tài khoản chỉ gồm chữ số'),
});

const cashSchema = z.object({
  ...baseFields,
  type: z.literal('cash'),
});

export const createFundSourceSchema = z.discriminatedUnion('type', [
  bankSchema,
  cashSchema,
]);

// Flat shape for react-hook-form: every field exists while the user switches
// type; the schema decides which ones are validated.
export type CreateFundSourceFormValues = Omit<
  z.infer<typeof bankSchema>,
  'type'
> & {
  type: FundSourceType;
};

export const getCreateFundSourceDefaultValues = (
  type: FundSourceType = 'bank',
): CreateFundSourceFormValues => ({
  type,
  name: '',
  owner_name: '',
  account_number: '',
  code: '',
  bin: 0,
  short_name: '',
  balance: 0,
});

export const toCreateFundSourceRequest = (
  values: CreateFundSourceFormValues,
): CreateFundSourceRequest => {
  const base = {
    name: values.name,
    start_balance: values.balance,
    currency: 'VND' as const,
  };
  if (values.type === 'cash') {
    return {
      ...base,
      type: 'cash',
      details: { owner_name: values.owner_name },
    };
  }
  return {
    ...base,
    type: 'bank',
    details: {
      owner_name: values.owner_name,
      account_number: values.account_number,
      bank_code: values.code,
      bank_bin: values.bin,
      bank_short_name: values.short_name,
    },
  };
};

const createFundSource = (values: CreateFundSourceFormValues) =>
  http.post<CreateFundSourceResponse, CreateFundSourceRequest>(
    CREATE_FUND_SOURCE_URL,
    toCreateFundSourceRequest(values),
  );

export const useCreateFundSource = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFundSource,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [FUND_SOURCES_URL] }),
  });
};
