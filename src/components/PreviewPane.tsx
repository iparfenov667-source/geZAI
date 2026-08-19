import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { FileText, Minus, Plus, FileDown, FlaskConical } from "lucide-react";

interface Props {
  hasTemplate: boolean;
  fileName: string | null;
  html: string | null;
  busy: boolean;
  filledCount: number;
  totalCount: number;
  stampKey: number;
  onPickFile: () => void;
  onDemo: () => void;
}

const SHEET_W = 794;

export default function PreviewPane({
  hasTemplate,
  fileName,
  html,
  busy,
  filledCount,
  totalCount,
  stampKey,
  onPickFile,
  onDemo,
}: Props) {
  const [zoom, setZoom] = useState(100);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheetH, setSheetH] = useState(1123);
  const stampDate = useMemo(
    () => new Date().toLocaleDateString("ru-RU"),
    []
  );

  useLayoutEffect(() => {
    if (sheetRef.current) setSheetH(sheetRef.current.offsetHeight);
  }, [html, zoom, hasTemplate]);

  const k = zoom / 100;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* toolbar */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-pine-800 bg-pine-900/70 px-4">
        <FileText size={15} className="shrink-0 text-brass-300" />
        <span className="min-w-0 truncate font-mono text-[12px] text-paper-100">
          {fileName ?? "шаблон не загружен"}
        </span>
        {hasTemplate && (
          <span className="ml-1 hidden items-center gap-2 sm:flex">
            <span className="h-1 w-16 overflow-hidden rounded-full bg-pine-800">
              <span
                className="block h-full rounded-full bg-emerald-400 transition-all duration-500"
                style={{
                  width: totalCount ? `${(filledCount / totalCount) * 100}%` : "0%",
                }}
              />
            </span>
            <span className="font-mono text-[10px] tabular-nums text-pine-300">
              {filledCount}/{totalCount}
            </span>
          </span>
        )}
        <div className="ml-auto flex items-center gap-1 rounded-md border border-pine-700 bg-pine-850/80 p-0.5">
          <button
            onClick={() => setZoom((z) => Math.max(55, z - 10))}
            disabled={!hasTemplate}
            className="grid h-7 w-7 place-items-center rounded text-pine-300 transition-colors hover:bg-pine-700 hover:text-paper-50 disabled:opacity-30"
            title="Уменьшить"
          >
            <Minus size={14} />
          </button>
          <span className="w-11 text-center font-mono text-[11px] tabular-nums text-paper-100">
            {zoom}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(160, z + 10))}
            disabled={!hasTemplate}
            className="grid h-7 w-7 place-items-center rounded text-pine-300 transition-colors hover:bg-pine-700 hover:text-paper-50 disabled:opacity-30"
            title="Увеличить"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* desk */}
      <div className="desk-grid min-h-0 flex-1 overflow-auto">
        <div className="flex min-h-full flex-col items-center px-4 py-8 sm:px-8">
          {hasTemplate ? (
            <>
              <div
                className="relative transition-[width,height] duration-200 ease-out"
                style={{ width: SHEET_W * k, height: sheetH * k }}
              >
                <div
                  ref={sheetRef}
                  style={{
                    width: SHEET_W,
                    transform: `scale(${k})`,
                    transformOrigin: "top left",
                  }}
                >
                  <div className="sheet relative rounded-[3px] border border-paper-300 bg-paper-50 px-16 py-14 text-ink-900 shadow-[0_24px_60px_-16px_rgba(20,33,27,0.45),0_4px_14px_rgba(20,33,27,0.18)]">
                    {html ? (
                      <div
                        className="doc-prose"
                        dangerouslySetInnerHTML={{ __html: html }}
                      />
                    ) : (
                      <div className="space-y-3.5 py-4">
                        <div className="shimmer mx-auto h-5 w-1/2 rounded" />
                        <div className="shimmer mx-auto mb-6 h-3 w-1/3 rounded" />
                        {Array.from({ length: 16 }).map((_, i) => (
                          <div
                            key={i}
                            className={
                              "shimmer h-3 rounded " +
                              (i % 5 === 4 ? "w-2/3" : "w-full")
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* индикатор обновления */}
                  <div
                    className={[
                      "pointer-events-none absolute -top-4 left-1/2 z-20 -translate-x-1/2 transition-all duration-300",
                      busy ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
                    ].join(" ")}
                  >
                    <span className="inline-flex items-center gap-2 rounded-full bg-pine-900 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-brass-300 shadow-xl">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brass-400 opacity-70" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-brass-400" />
                      </span>
                      обновляем превью
                    </span>
                  </div>

                  {/* штамп */}
                  {stampKey > 0 && (
                    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
                      <div
                        key={stampKey}
                        className="stamp-anim mix-blend-multiply rounded-lg border-[3px] border-emerald-700/70 px-9 py-4 text-center"
                      >
                        <p className="font-display text-[26px] font-extrabold uppercase leading-tight tracking-[0.22em] text-emerald-700/85">
                          Сформирован
                        </p>
                        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.32em] text-emerald-700/70">
                          договорник · {stampDate}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-5 max-w-md text-center font-mono text-[10px] leading-relaxed text-[#6d7a6f]">
                превью упрощённое — шрифты, выравнивание и отступы исходного
                шаблона сохраняются в скачанном .docx
              </p>
            </>
          ) : (
            <div className="anim-rise my-auto w-full max-w-xl py-8">
              <div className="mx-auto max-w-md rotate-[1.6deg] rounded-sm border-2 border-dashed border-[#96a294] bg-paper-50/70 px-10 py-14 text-center shadow-[0_24px_50px_-20px_rgba(20,33,27,0.4)] transition-transform duration-300 hover:rotate-0">
                <p className="select-none font-mono text-[92px] font-bold leading-none tracking-tight text-brass-500/90">
                  {"{ }"}
                </p>
                <p className="mt-5 font-mono text-[11px] leading-relaxed tracking-wide text-ink-400">
                  {"{город}  {заказчик}  {сумма_договора}"}
                </p>
                <p className="mt-5 text-[14px] font-medium text-ink-600">
                  Здесь появится лист вашего договора
                </p>
              </div>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  onClick={onPickFile}
                  className="inline-flex items-center gap-2 rounded-md bg-pine-800 px-5 py-2.5 text-[14px] font-semibold text-paper-50 shadow-lg transition-all hover:bg-pine-700 hover:shadow-xl active:scale-[0.98]"
                >
                  <FileDown size={16} strokeWidth={2} />
                  Выбрать файл .docx
                </button>
                <button
                  onClick={onDemo}
                  className="inline-flex items-center gap-2 rounded-md border border-pine-600 bg-paper-50/60 px-5 py-2.5 text-[14px] font-medium text-pine-800 transition-all hover:border-brass-500 hover:text-brass-600 active:scale-[0.98]"
                >
                  <FlaskConical size={15} strokeWidth={1.8} />
                  Пример шаблона
                </button>
              </div>

              <div className="mt-10 flex flex-col items-start justify-center gap-3 sm:flex-row sm:items-center sm:gap-5">
                {["Загрузите шаблон .docx", "Заполните поля", "Скачайте договор"].map(
                  (s, i) => (
                    <div key={s} className="flex items-center gap-2.5">
                      <span className="font-mono text-[11px] font-bold text-brass-600">
                        0{i + 1}
                      </span>
                      <span className="text-[13px] font-medium text-ink-600">{s}</span>
                      {i < 2 && (
                        <span className="ml-2 hidden font-mono text-pine-500 sm:inline">
                          →
                        </span>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
