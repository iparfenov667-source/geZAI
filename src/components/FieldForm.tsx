import { Check, Eraser } from "lucide-react";
import { humanizeTag } from "../lib/docx";

interface Props {
  tags: string[];
  values: Record<string, string>;
  onChange: (tag: string, value: string) => void;
  onClear: () => void;
}

export default function FieldForm({ tags, values, onChange, onClear }: Props) {
  const filled = tags.filter((t) => (values[t] ?? "").trim().length > 0).length;
  const pct = tags.length ? Math.round((filled / tags.length) * 100) : 0;

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-pine-800">
          <div
            className="h-full rounded-full bg-brass-400 transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-mono text-[11px] tabular-nums text-pine-300">
          {filled}/{tags.length}
        </span>
        <button
          onClick={onClear}
          disabled={filled === 0}
          title="Очистить все поля записи"
          className="inline-flex items-center gap-1.5 rounded-md border border-pine-700 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-pine-300 transition-all hover:border-red-400/60 hover:text-red-300 active:scale-95 disabled:opacity-40 disabled:hover:border-pine-700 disabled:hover:text-pine-300"
        >
          <Eraser size={12} />
          очистить
        </button>
      </div>

      <div className="space-y-3.5">
        {tags.map((tag, i) => {
          const val = values[tag] ?? "";
          const isFilled = val.trim().length > 0;
          const fieldId = "field-" + tag.replace(/[^\wа-яёa-z0-9]+/gi, "_");
          return (
            <div
              key={tag}
              className="anim-rise"
              style={{ animationDelay: `${Math.min(i * 40, 480)}ms` }}
            >
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <label
                  htmlFor={fieldId}
                  className="truncate text-[13px] font-medium text-pine-100"
                >
                  {humanizeTag(tag)}
                </label>
                <code className="shrink-0 rounded border border-pine-700 bg-pine-950/60 px-1.5 py-0.5 font-mono text-[10px] text-brass-300/90">
                  {"{" + tag + "}"}
                </code>
              </div>
              <div className="relative">
                <input
                  id={fieldId}
                  value={val}
                  onChange={(e) => onChange(tag, e.target.value)}
                  placeholder={humanizeTag(tag).toLowerCase() + "…"}
                  autoComplete="off"
                  className={[
                    "w-full rounded-md border bg-pine-950/50 px-3 py-2 pr-9 text-sm text-paper-50 placeholder:text-pine-500 transition-all duration-200 outline-none",
                    isFilled
                      ? "border-pine-600 focus:border-brass-400 focus:bg-pine-950/80"
                      : "border-dashed border-pine-600 focus:border-solid focus:border-brass-400",
                    "focus:shadow-[0_0_0_3px_rgba(237,166,60,0.12)]",
                  ].join(" ")}
                />
                {isFilled && (
                  <span className="anim-pop pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-400">
                    <Check size={15} strokeWidth={2.4} />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {pct === 100 && (
        <p className="anim-rise mt-4 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-300">
          <Check size={14} strokeWidth={2.4} />
          Все поля заполнены — можно скачивать договор.
        </p>
      )}
    </div>
  );
}
