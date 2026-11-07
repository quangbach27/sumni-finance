import { useState } from 'react';

import { Check } from 'lucide-react';

import { Button } from '@/components/ui/button';

import StepActionBar from './step-action-bar';
import StepFlow from './step-flow';
import { useStepFlow } from './step-flow-context';

import type { FlowStep } from './step-flow';
import type { Meta, StoryObj } from '@storybook/react-vite';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const box = (text: string) => (
  <div className="bg-card rounded-2xl border p-4 shadow-sm">{text}</div>
);

/** Demo step body with an action bar that opens the shared confirm dialog. */
function DemoStep({
  text,
  label,
  dialogTitle,
  dialogDescription,
  helper,
  disabled,
  onConfirm,
}: {
  text: string;
  label: string;
  dialogTitle: string;
  dialogDescription: string;
  helper?: string;
  disabled?: boolean;
  onConfirm: () => Promise<unknown>;
}) {
  const { isCurrent, openConfirm } = useStepFlow();
  return (
    <>
      {box(text)}
      {isCurrent && (
        <StepActionBar helper={helper}>
          <Button
            disabled={disabled}
            onClick={() =>
              openConfirm({
                title: dialogTitle,
                description: dialogDescription,
                confirmLabel: label,
                onConfirm,
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

/** Demo step body whose action just moves on, with no confirm dialog. */
function ContinueStep({
  text,
  onContinue,
}: {
  text: string;
  onContinue: () => void;
}) {
  const { isCurrent } = useStepFlow();
  return (
    <>
      {box(text)}
      {isCurrent && (
        <StepActionBar>
          <Button onClick={onContinue}>Tiếp tục</Button>
        </StepActionBar>
      )}
    </>
  );
}

type Overrides = {
  disabled?: boolean;
  /** When set, step 1 shows a plain "Tiếp tục" action (no confirm dialog). */
  onRecord?: () => void;
  onReconcile?: () => Promise<unknown>;
  onReport?: () => Promise<unknown>;
};

const buildSteps = ({
  disabled,
  onRecord,
  onReconcile = () => wait(800),
  onReport = () => wait(800),
}: Overrides = {}): FlowStep[] => [
  {
    id: 'record',
    title: 'Ghi bút toán',
    hint: 'Đã đóng',
    content: onRecord ? (
      <ContinueStep text="Bút toán đã ghi" onContinue={onRecord} />
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
        onConfirm={onReconcile}
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
        onConfirm={onReport}
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
  args: { steps: buildSteps(), currentStepId: 'reconcile' },
} satisfies Meta<typeof StepFlow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Mobile: Story = { globals: mobile };

export const LastStep: Story = { args: { currentStepId: 'report' } };

export const AllDone: Story = { args: { currentStepId: null } };

export const ConfirmDisabled: Story = {
  args: { steps: buildSteps({ disabled: true }) },
};

/** Click "Đánh dấu đã đối soát" and confirm: the dialog closes, an alert shows above the step and the stepper marks it invalid. */
export const ConfirmFails: Story = {
  args: { steps: buildSteps({ onReconcile: failing }) },
};

export const ConfirmFailsMobile: Story = { ...ConfirmFails, globals: mobile };

function InteractiveFlow() {
  const [currentStepId, setCurrentStepId] = useState<string | null>('record');
  const advance = (next: string | null) => async () => {
    await wait(500);
    setCurrentStepId(next);
  };
  return (
    <div className="flex flex-col gap-5">
      <StepFlow
        steps={buildSteps({
          onRecord: () => setCurrentStepId('reconcile'),
          onReconcile: advance('report'),
          onReport: advance(null),
        })}
        currentStepId={currentStepId}
      />
      {currentStepId === null && (
        <Button variant="outline" onClick={() => setCurrentStepId('record')}>
          Đặt lại
        </Button>
      )}
    </div>
  );
}

/** Step 1 continues without a dialog; steps 2 and 3 confirm and move on; the last one completes the flow. */
export const Interactive: Story = {
  render: () => <InteractiveFlow />,
};

export const InteractiveMobile: Story = { ...Interactive, globals: mobile };
