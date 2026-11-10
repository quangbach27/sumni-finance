import { Check } from 'lucide-react';

import { Button } from '@/components/ui/button';

import StepActionBar from './step-action-bar';
import StepFlow from './step-flow';
import { useStepFlowActions, useStepFlowState } from './step-flow-context';

import type { FlowStep } from './step-flow';
import type { StepDirection } from './step-flow-context';
import type { Meta, StoryObj } from '@storybook/react-vite';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const box = (text: string) => (
  <div className="bg-card rounded-2xl border p-4 shadow-sm">{text}</div>
);

/** Demo step body whose action bar opens the flow's confirm dialog; the flow moves on after `action`. */
function DemoStep({
  text,
  label,
  dialogTitle,
  dialogDescription,
  helper,
  disabled,
  direction,
  action,
  backLabel,
  onBack,
}: {
  text: string;
  label: string;
  dialogTitle: string;
  dialogDescription: string;
  helper?: string;
  disabled?: boolean;
  direction?: StepDirection;
  action: () => Promise<unknown>;
  /** When set, adds a secondary action that sends the flow back a step. */
  backLabel?: string;
  onBack?: () => Promise<unknown>;
}) {
  const { isCurrent } = useStepFlowState();
  const { openConfirm, runAction } = useStepFlowActions();
  return (
    <>
      {box(text)}
      {isCurrent && (
        <StepActionBar helper={helper}>
          {backLabel && onBack && (
            <Button
              variant="outline"
              onClick={() => runAction(onBack, 'backward')}
            >
              {backLabel}
            </Button>
          )}
          <Button
            disabled={disabled}
            onClick={() =>
              openConfirm({
                title: dialogTitle,
                description: dialogDescription,
                confirmLabel: label,
                action,
                direction,
              })
            }
          >
            <Check data-icon="inline-start" />
            {label}
          </Button>
        </StepActionBar>
      )}
    </>
  );
}

/** Demo step body whose action runs straight through `runAction`, with no confirm dialog. */
function ContinueStep({ text }: { text: string }) {
  const { isCurrent } = useStepFlowState();
  const { runAction } = useStepFlowActions();
  return (
    <>
      {box(text)}
      {isCurrent && (
        <StepActionBar>
          <Button onClick={() => runAction(() => wait(500))}>Tiếp tục</Button>
        </StepActionBar>
      )}
    </>
  );
}

type Overrides = {
  disabled?: boolean;
  /** When set, step 1 shows a plain "Tiếp tục" action (no confirm dialog). */
  continueWithoutDialog?: boolean;
  /** When set, the reconcile step also offers "Mở lại kỳ", which goes back a step. */
  withReopen?: boolean;
  onReconcile?: () => Promise<unknown>;
  onReport?: () => Promise<unknown>;
};

const buildSteps = ({
  disabled,
  continueWithoutDialog,
  withReopen,
  onReconcile = () => wait(800),
  onReport = () => wait(800),
}: Overrides = {}): FlowStep[] => [
  {
    id: 'record',
    title: 'Ghi bút toán',
    hint: 'Đã đóng',
    content: continueWithoutDialog ? (
      <ContinueStep text="Bút toán đã ghi" />
    ) : (
      box('Bút toán đã ghi')
    ),
  },
  {
    id: 'reconcile',
    title: 'Đối soát',
    hint: 'Đang kiểm tra',
    content: (
      <DemoStep
        text="Nhập số dư thực tế"
        label="Đánh dấu đã đối soát"
        dialogTitle="Hoàn tất đối soát?"
        dialogDescription="Sau khi xác nhận, không thể sửa số dư."
        helper={
          disabled
            ? 'Cần xác nhận đủ 3 nguồn quỹ'
            : 'Tất cả nguồn quỹ đã được xác nhận'
        }
        disabled={disabled}
        action={onReconcile}
        backLabel={withReopen ? 'Mở lại kỳ' : undefined}
        onBack={withReopen ? () => wait(500) : undefined}
      />
    ),
  },
  {
    id: 'report',
    title: 'Báo cáo',
    hint: 'Chưa tạo',
    content: (
      <DemoStep
        text="Tạo báo cáo"
        label="Tạo báo cáo"
        dialogTitle="Tạo báo cáo?"
        dialogDescription="Báo cáo ghi lại số dư từng nguồn quỹ."
        action={onReport}
      />
    ),
  },
];

const failing = async () => {
  await wait(300);
  throw new Error('Số dư không khớp.');
};

const mobile = { viewport: { value: 'mobile1', isRotated: false } };

const meta = {
  title: 'Shared/StepFlow',
  component: StepFlow,
  tags: ['autodocs'],
  args: { steps: buildSteps(), initialStepId: 'reconcile' },
} satisfies Meta<typeof StepFlow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Mobile: Story = { globals: mobile };

export const LastStep: Story = { args: { initialStepId: 'report' } };

export const AllDone: Story = { args: { initialStepId: null } };

export const ConfirmDisabled: Story = {
  args: { steps: buildSteps({ disabled: true }) },
};

/** Click "Đánh dấu đã đối soát" and confirm: the dialog closes, the flow stays on the step, an alert shows and the stepper marks it invalid. */
export const ConfirmFails: Story = {
  args: { steps: buildSteps({ onReconcile: failing }) },
};

export const ConfirmFailsMobile: Story = { ...ConfirmFails, globals: mobile };

/** "Mở lại kỳ" runs its action, then sends the flow back to step 1. */
export const ReopenGoesBack: Story = {
  args: { steps: buildSteps({ withReopen: true }) },
};

/** Step 1 continues without a dialog; steps 2 and 3 confirm and move on; the last one completes the flow. */
export const Interactive: Story = {
  args: {
    steps: buildSteps({ continueWithoutDialog: true, withReopen: true }),
    initialStepId: 'record',
  },
};

export const InteractiveMobile: Story = { ...Interactive, globals: mobile };
