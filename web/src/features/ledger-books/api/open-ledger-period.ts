import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { http } from '@/lib/clients';
import {
  endOfDay,
  parseDateString,
  startOfDay,
  toDateString,
} from '@/lib/date';

import { LEDGER_PERIODS_URL } from './get-ledger-periods';

import type {
  LedgerPeriod,
  OpenLedgerPeriodRequest,
  OpenLedgerPeriodResponse,
} from './types';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const openLedgerPeriodSchema = z
  .object({
    name: z.string().trim().min(1, 'Vui lòng nhập tên kỳ'),
    open_date: z.string().regex(DATE_PATTERN, 'Vui lòng chọn ngày bắt đầu'),
    close_date: z.string().regex(DATE_PATTERN, 'Vui lòng chọn ngày kết thúc'),
  })
  .refine((v) => v.close_date >= v.open_date, {
    path: ['close_date'],
    message: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu',
  });

export type OpenLedgerPeriodFormValues = z.infer<typeof openLedgerPeriodSchema>;

/** Suggests the month following `previous`, or the current month. */
export const getOpenLedgerPeriodDefaultValues = (
  previous?: Pick<LedgerPeriod, 'close_date'>,
): OpenLedgerPeriodFormValues => {
  const base = previous ? new Date(previous.close_date) : new Date();
  const monthIndex = previous ? base.getMonth() + 1 : base.getMonth();
  const first = new Date(base.getFullYear(), monthIndex, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  return {
    name: `Tháng ${first.getMonth() + 1}/${first.getFullYear()}`,
    open_date: toDateString(first),
    close_date: toDateString(last),
  };
};

export const toOpenLedgerPeriodRequest = (
  values: OpenLedgerPeriodFormValues,
  fundSourceUuids: string[],
): OpenLedgerPeriodRequest => ({
  name: values.name,
  open_date: startOfDay(parseDateString(values.open_date)!).toISOString(),
  close_date: endOfDay(parseDateString(values.close_date)!).toISOString(),
  fund_source_uuids: fundSourceUuids,
});

type OpenLedgerPeriodInput = {
  values: OpenLedgerPeriodFormValues;
  fundSourceUuids: string[];
};

const openLedgerPeriod = ({ values, fundSourceUuids }: OpenLedgerPeriodInput) =>
  http.post<OpenLedgerPeriodResponse, OpenLedgerPeriodRequest>(
    LEDGER_PERIODS_URL,
    toOpenLedgerPeriodRequest(values, fundSourceUuids),
  );

export const useOpenLedgerPeriod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: openLedgerPeriod,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [LEDGER_PERIODS_URL] }),
      ]),
  });
};
