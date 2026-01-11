import { Card } from "./Card";
import { Modal } from "./Modal";

export type TutorialModalProps = {
  open: boolean;
  step: number;
  total: number;
  title: string;
  body: string;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
};

export function TutorialModal({
  open,
  step,
  total,
  title,
  body,
  onNext,
  onPrev,
  onClose,
}: TutorialModalProps) {
  const titleId = "tutorial-modal-title";
  const descriptionId = "tutorial-modal-description";

  return (
    <Modal open={open} onClose={onClose} className="max-w-lg" labelledBy={titleId} describedBy={descriptionId}>
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Welcome to Solace Journal
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Step {step + 1} of {total}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          <div id={titleId} className="mt-4 text-base font-semibold text-slate-900">
            {title}
          </div>
          <div id={descriptionId} className="mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {body}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={onPrev}
              disabled={step === 0}
              className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-40"
            >
              Back
            </button>

            <button
              type="button"
              onClick={onNext}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
            >
              {step === total - 1 ? "Got it" : "Next"}
            </button>
          </div>
        </Card>
    </Modal>
  );
}
