import type { LedgerPeriod } from './types';

/**
 * TODO: replace with real data once the backend exposes the entry count per
 * period.
 */
export const getMockPeriodExtras = (
  _period: Pick<LedgerPeriod, 'uuid'>,
): { entryCount: number } => ({ entryCount: 24 });
