import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import type { ToastItem } from "../types";

const ICONS = {
  success: <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-400" />,
  error: <AlertTriangle size={17} className="mt-0.5 shrink-0 text-red-400" />,
  info: <Info size={17} className="mt-0.5 shrink-0 text-brass-300" />,
};

export default function Toasts({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="anim-toast pointer-events-auto flex w-[min(92vw,370px)] items-start gap-2.5 rounded-lg border border-pine-700 bg-pine-850 px-3.5 py-3 shadow-[0_16px_40px_rgba(4,12,9,0.5)]"
        >
          {ICONS[t.kind]}
          <p className="flex-1 text-[13px] leading-snug text-paper-100">{t.text}</p>
          <button
            onClick={() => onDismiss(t.id)}
            className="shrink-0 rounded p-0.5 text-pine-400 transition-colors hover:bg-pine-700 hover:text-paper-50"
            title="Закрыть"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
