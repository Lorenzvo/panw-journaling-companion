import { Card } from "./Card";
import { Modal } from "./Modal";

export type ConfirmDialogTone = "danger" | "neutral";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmDialogTone;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = "confirm-dialog-title";
  const descriptionId = "confirm-dialog-description";

  const confirmClasses =
    tone === "danger"
      ? "bg-rose-600 text-white hover:opacity-95"
      : "bg-slate-900 text-white hover:opacity-95";

  return (
    <Modal open={open} onClose={onCancel} className="max-w-md" labelledBy={titleId} describedBy={descriptionId}>
        <Card className="p-4">
          <div id={titleId} className="text-base font-semibold text-slate-900">
            {title}
          </div>
          <div id={descriptionId} className="mt-2 text-sm text-slate-600 leading-relaxed">
            {description}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm ${confirmClasses}`}
            >
              {confirmText}
            </button>
          </div>
        </Card>
    </Modal>
  );
}
