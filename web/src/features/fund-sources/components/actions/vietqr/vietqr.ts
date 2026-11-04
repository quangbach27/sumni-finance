export type VietQrTemplate = 'compact2' | 'compact' | 'qr_only' | 'print';

type BuildVietQrUrlParams = {
  bankBin: number | string;
  accountNumber: string;
  accountName?: string;
  amount?: number;
  addInfo?: string;
  template?: VietQrTemplate;
  format?: 'png' | 'svg';
};

/** Image URL from img.vietqr.io for a bank transfer QR. */
export const buildVietQrUrl = ({
  bankBin,
  accountNumber,
  accountName,
  amount,
  addInfo,
  template = 'compact2',
  format = 'png',
}: BuildVietQrUrlParams): string => {
  const params = new URLSearchParams();
  if (amount && amount > 0) params.set('amount', String(amount));
  if (addInfo?.trim()) params.set('addInfo', addInfo.trim());
  if (accountName?.trim()) params.set('accountName', accountName.trim());

  const query = params.toString();
  const base = `https://img.vietqr.io/image/${bankBin}-${accountNumber}-${template}.${format}`;
  return query ? `${base}?${query}` : base;
};
