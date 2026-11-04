import { useEffect, useMemo, useState } from 'react';

import { debounce } from 'lodash-es';
import { Check, Download, Link2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { Skeleton } from '@/components/ui/skeleton';

import {
  formatAmount,
  formatCurrency,
  getCurrencySymbol,
  parseAmount,
} from '@/lib/currency';

import { buildVietQrUrl } from './vietqr';
import FundSourceAvatar from '../../fund-source-avatar';

import type { FundSource } from '../../../api/types';
import type { FundSourceActionDialogProps } from '../types';

const DEBOUNCE_MS = 300;

const VietQrContent = ({ fundSource }: { fundSource: FundSource }) => {
  const { currency, details } = fundSource;
  const [amountText, setAmountText] = useState('');
  const [addInfo, setAddInfo] = useState('');
  const [copied, setCopied] = useState(false);
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>(
    'loading',
  );

  // Values applied to the QR; updated after the user stops typing.
  const [qrAmount, setQrAmount] = useState(0);
  const [qrInfo, setQrInfo] = useState('');
  const debouncedSetAmount = useMemo(
    () => debounce(setQrAmount, DEBOUNCE_MS),
    [],
  );
  const debouncedSetInfo = useMemo(() => debounce(setQrInfo, DEBOUNCE_MS), []);

  useEffect(
    () => () => {
      debouncedSetAmount.cancel();
      debouncedSetInfo.cancel();
    },
    [debouncedSetAmount, debouncedSetInfo],
  );

  const accountNumber = details.account_number ?? '';
  const url = buildVietQrUrl({
    bankBin: details.bank_bin ?? details.bank_code ?? '',
    accountNumber,
    accountName: details.owner_name,
    amount: qrAmount,
    addInfo: qrInfo,
  });

  useEffect(() => setImageState('loading'), [url]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadImage = async () => {
    let blob: Blob;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch QR');
      blob = await response.blob();
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    const fileName = `vietqr-${accountNumber}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });

    // On mobile, the share sheet offers "Save Image" to the photo library.
    if ('canShare' in navigator && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      }
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(objectUrl);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl">Tạo mã VietQR</DialogTitle>
        <DialogDescription>
          Quét mã để chuyển tiền vào tài khoản này.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <FundSourceAvatar item={fundSource} />
            <div className="flex min-w-0 flex-col">
              <span className="font-semibold">{details.owner_name}</span>
              <span className="text-muted-foreground text-sm">
                {details.bank_code} · {accountNumber}
              </span>
            </div>
          </div>

          <Field>
            <FieldLabel htmlFor="vietqr-amount">Số tiền (tùy chọn)</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="vietqr-amount"
                inputMode="numeric"
                value={amountText}
                placeholder="0"
                onChange={(e) => {
                  const value = parseAmount(e.target.value, currency);
                  setAmountText(value > 0 ? formatAmount(value, currency) : '');
                  debouncedSetAmount(value);
                }}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText>{getCurrencySymbol(currency)}</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          </Field>

          <Field>
            <FieldLabel htmlFor="vietqr-info">
              Nội dung chuyển khoản (tùy chọn)
            </FieldLabel>
            <Input
              id="vietqr-info"
              value={addInfo}
              maxLength={50}
              placeholder="Ví dụ: Thu quỹ tháng 11"
              onChange={(e) => {
                setAddInfo(e.target.value);
                debouncedSetInfo(e.target.value);
              }}
            />
          </Field>

          <FieldDescription>
            Mã gồm ngân hàng, số tài khoản, số tiền và nội dung. Bạn không cần
            nhập mã ngân hàng.
          </FieldDescription>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="relative w-full overflow-hidden rounded-xl border bg-white p-2 shadow-sm">
            {imageState === 'loading' && (
              <Skeleton className="absolute inset-2 rounded-lg" />
            )}
            {imageState === 'error' ? (
              <p className="text-muted-foreground p-6 text-center text-sm">
                Không thể tải mã QR. Vui lòng thử lại.
              </p>
            ) : (
              <img
                src={url}
                alt="Mã VietQR"
                className="w-full"
                onLoad={() => setImageState('loaded')}
                onError={() => setImageState('error')}
              />
            )}
          </div>
          {qrAmount > 0 && (
            <span className="font-semibold">
              {formatCurrency(qrAmount, currency)}
            </span>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => void copyLink()}>
          {copied ? (
            <Check data-icon="inline-start" />
          ) : (
            <Link2 data-icon="inline-start" />
          )}
          {copied ? 'Đã sao chép' : 'Sao chép liên kết'}
        </Button>
        <Button type="button" onClick={() => void downloadImage()}>
          <Download data-icon="inline-start" />
          Tải ảnh QR
        </Button>
      </DialogFooter>
    </>
  );
};

export default function VietQrActionDialog({
  fundSource,
  onClose,
}: FundSourceActionDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <VietQrContent fundSource={fundSource} />
      </DialogContent>
    </Dialog>
  );
}
