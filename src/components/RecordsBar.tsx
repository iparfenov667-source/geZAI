import { X, Copy } from "lucide-react";
import type { FillRecord } from "../types";

interface Props {
  records: FillRecord[];
  activeId: string;
  titles: string[];
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}

export default function RecordsBar({
  records,
  activeId,
  titles,
  onSelect,
  onAdd,
  onDelete,
}: Props) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {records.map((rec, i) => {
          const active = rec.id === activeId;
          return (
            <div key={rec.id} className="group relative">
              <button
                onClick={() => onSelect(rec.id)}
                className={[
                  "inline-flex max-w-[180px] items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-medium transition-all duration-200 active:scale-95",
                  active
                    ? "border-brass-400 bg-brass-400 text-pine-950 shadow-[0_2px_12px_rgba(237,166,60,0.25)]"
                    : "border-pine-700 bg-pine-850 text-pine-200 hover:border-pine-500 hover:text-paper-50",
                ].join(" ")}
              >
                <span
                  className={[
                    "font-mono text-[10px]",
                    active ? "text-pine-800" : "text-pine-400",
                  ].join(" ")}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="truncate">{titles[i]}</span>
              </button>
              {records.length > 1 && (
                <button
                  onClick={() => onDelete(rec.id)}
                  title="Удалить запись"
                  className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 place-items-center rounded-full bg-pine-600 text-paper-100 shadow transition-colors hover:bg-red-500 group-hover:grid"
                >
                  <X size={10} strokeWidth={2.6} />
                </button>
              )}
            </div>
          );
        })}
        <button
          onClick={onAdd}
          title="Создать копию активной записи"
          className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-pine-600 px-3 py-1.5 text-[12px] font-medium text-pine-300 transition-all hover:border-brass-400/70 hover:text-brass-300 active:scale-95"
        >
          <Copy size={12} strokeWidth={1.8} />
          копия
        </button>
      </div>
      <p className="mt-2.5 font-mono text-[10px] leading-relaxed text-pine-400">
        Запись — один комплект договора. Копируйте, чтобы заполнить договор
        сразу на несколько контрагентов, и скачайте всё архивом.
      </p>
    </div>
  );
}
