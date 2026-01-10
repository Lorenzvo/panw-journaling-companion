import { Card } from "./Card";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  tone = "danger", // "danger" | "neutral"
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  tone?: "danger" | "neutral";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  const confirmClasses =
    tone === "danger"
      ? "bg-rose-600 text-white hover:opacity-95"
      : "bg-slate-900 text-white hover:opacity-95";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-[92vw] max-w-md">
        <Card className="p-4">
          <div className="text-base font-semibold text-slate-900">{title}</div>
          <div className="mt-2 text-sm text-slate-600 leading-relaxed">
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
      </div>
    </div>
  );
}
