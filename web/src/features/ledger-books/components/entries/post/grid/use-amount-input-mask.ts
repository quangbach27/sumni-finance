import { DEFAULT_CURRENCY, formatAmountInputWithCaret } from '@/lib/currency';

import { AMOUNT_COLUMN_IDS } from './columns';

import type { InputEvent, RefObject } from 'react';
import type { DataSheetGridRef } from 'react-datasheet-grid';

/**
 * Live thousands-separator masking for the Nợ / Có cells. Returns capture
 * handlers for the grid's wrapper, since the cell inputs are not ours.
 */
export function useAmountInputMask(
  gridRef: RefObject<DataSheetGridRef | null>,
) {
  const isAmountInput = (target: EventTarget): target is HTMLInputElement =>
    target instanceof HTMLInputElement &&
    AMOUNT_COLUMN_IDS.includes(gridRef.current?.activeCell?.colId ?? '');

  /** Only digits can be typed. */
  const onBeforeInputCapture = (e: InputEvent<HTMLDivElement>) => {
    const data = e.nativeEvent.data;
    if (data && isAmountInput(e.target) && /\D/.test(data)) e.preventDefault();
  };

  /** Re-formats the text after each edit and keeps the caret in place. */
  const onInputCapture = (e: InputEvent<HTMLDivElement>) => {
    const input = e.target;
    if (!isAmountInput(input)) return;

    const { formatted, caret } = formatAmountInputWithCaret(
      input.value,
      input.selectionStart ?? input.value.length,
      DEFAULT_CURRENCY,
    );
    if (formatted === input.value) return;

    // The native setter bypasses React's value tracker, so the re-dispatched
    // event below still triggers the cell's onChange (and updates the row).
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set?.call(input, formatted);
    input.setSelectionRange(caret, caret);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  return { onBeforeInputCapture, onInputCapture };
}
