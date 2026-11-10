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
import { UNLOCKED_LEDGER_PERIOD_URL } from './get-unlocked-ledger-period';

import type {
  OpenLedgerPeriodRequest,
  OpenLedgerPeriodResponse,
} from './response';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const openLedgerPeriodSchema = z
  .object({
    name: z.string().trim().min(1, 'Vui lòng nhập tên kỳ'),
    openDate: z.string().regex(DATE_PATTERN, 'Vui lòng chọn ngày bắt đầu'),
    closeDate: z.string().regex(DATE_PATTERN, 'Vui lòng chọn ngày kết thúc'),
  })
  .refine((v) => v.closeDate >= v.openDate, {
    path: ['closeDate'],
    message: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu',
  });

export type OpenLedgerPeriodFormValues = z.infer<typeof openLedgerPeriodSchema>;

/** Suggests the month following `previous`, or the current month. */
export const getOpenLedgerPeriodDefaultValues = (
  prevCloseDate?: string,
): OpenLedgerPeriodFormValues => {
  // Next month after the previous period, or the current month if there is none.
  const ref = prevCloseDate ? new Date(prevCloseDate) : new Date();
  const offset = prevCloseDate ? 1 : 0;

  const first = new Date(ref.getFullYear(), ref.getMonth() + offset, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);

  return {
    name: `Tháng ${first.getMonth() + 1}/${first.getFullYear()}`,
    openDate: toDateString(first),
    closeDate: toDateString(last),
  };
};

type OpenLedgerPeriodInput = {
  values: OpenLedgerPeriodFormValues;
  fundSourceUuids: string[];
};

const toOpenLedgerPeriodRequest = ({
  values,
  fundSourceUuids,
}: OpenLedgerPeriodInput): OpenLedgerPeriodRequest => ({
  name: values.name,
  open_date: startOfDay(parseDateString(values.openDate)!).toISOString(),
  close_date: endOfDay(parseDateString(values.closeDate)!).toISOString(),
  fund_source_uuids: fundSourceUuids,
});

const openLedgerPeriod = (input: OpenLedgerPeriodInput) =>
  http.post<OpenLedgerPeriodResponse, OpenLedgerPeriodRequest>(
    LEDGER_PERIODS_URL,
    toOpenLedgerPeriodRequest(input),
  );

export const useOpenLedgerPeriod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: openLedgerPeriod,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [LEDGER_PERIODS_URL] }),
        queryClient.invalidateQueries({
          queryKey: [UNLOCKED_LEDGER_PERIOD_URL],
        }),
      ]),
  });
};
