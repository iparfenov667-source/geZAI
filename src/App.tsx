import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FileText,
  RotateCcw,
  FolderOpen,
  FileDown,
  Archive,
  Braces,
} from "lucide-react";
import Dropzone from "./components/Dropzone";
import FieldForm from "./components/FieldForm";
import RecordsBar from "./components/RecordsBar";
import PreviewPane from "./components/PreviewPane";
import Toasts from "./components/Toasts";
import {
  extractTags,
  renderDocx,
  docxToHtml,
  buildDemoTemplate,
  DEMO_FILE_NAME,
  bufferToBase64,
  base64ToBuffer,
  downloadBlob,
  makeZip,
  slugify,
  DOCX_MIME,
} from "./lib/docx";
import type { TemplateState, FillRecord, ToastItem } from "./types";

const LS_KEY = "dogovornik.state.v1";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

/* ---------- персистентность ---------- */

interface Persisted {
  template: TemplateState | null;
  records: FillRecord[];
  activeId: string;
}

let persistedCache: Persisted | null | undefined;
function loadPersisted(): Persisted | null {
  if (persistedCache !== undefined) return persistedCache;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      persistedCache = null;
      return null;
    }
    const data = JSON.parse(raw) as Persisted;
    if (!data || !Array.isArray(data.records)) {
      persistedCache = null;
      return null;
    }
    if (data.template && (!data.template.b64 || !data.template.tags)) {
      data.template = null;
    }
    persistedCache = data;
    return data;
  } catch {
    persistedCache = null;
    return null;
  }
}

/* ---------- вспомогательные ---------- */

function firstFilledValue(rec: FillRecord, tags: string[]): string {
  const tag = tags.find((t) => (rec.values[t] ?? "").trim().length > 0);
  return tag ? rec.values[tag].trim() : "";
}

function SectionHead({ num, children }: { num: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 px-5 pb-3 pt-5">
      <span className="font-mono text-[10px] font-bold text-brass-400">{num}</span>
      <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-pine-300">
        {children}
      </h2>
      <div className="h-px flex-1 bg-pine-800" />
    </div>
  );
}

function Decor() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <span className="float-slow absolute -left-20 -top-52 hidden select-none font-mono text-[24rem] leading-none text-pine-800/45 md:block">
        {"{"}
      </span>
      <span className="absolute -bottom-60 -right-14 hidden select-none font-mono text-[24rem] leading-none text-pine-800/35 md:block">
        {"}"}
      </span>
      <div className="anim-rot absolute -right-44 -top-44 hidden h-[500px] w-[500px] rounded-full border border-dashed border-pine-700/50 lg:block">
        <div className="absolute inset-10 rounded-full border border-pine-700/30" />
        <div className="absolute inset-24 rounded-full border border-dashed border-pine-700/30" />
      </div>
    </div>
  );
}

/* ---------- приложение ---------- */

export default function App() {
  const [template, setTemplate] = useState<TemplateState | null>(
    () => loadPersisted()?.template ?? null
  );
  const [records, setRecords] = useState<FillRecord[]>(() => {
    const p = loadPersisted();
    return p?.records?.length ? p.records : [{ id: uid(), values: {} }];
  });
  const [activeId, setActiveId] = useState<string>(() => {
    const p = loadPersisted();
    const ids = p?.records?.map((r) => r.id) ?? [];
    return p?.activeId && ids.includes(p.activeId) ? p.activeId : "";
  });

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [html, setHtml] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  const [stampKey, setStampKey] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastId = useRef(0);
  const revRef = useRef(0);

  const active = records.find((r) => r.id === activeId) ?? records[0];
  const buffer = useMemo(
    () => (template ? base64ToBuffer(template.b64) : null),
    [template]
  );

  const toast = useCallback((kind: ToastItem["kind"], text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    window.setTimeout(
      () => setToasts((t) => t.filter((x) => x.id !== id)),
      4200
    );
  }, []);

  /* сохранение состояния */
  useEffect(() => {
    const payload: Persisted = { template, records, activeId: active.id };
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
    } catch {
      try {
        localStorage.setItem(
          LS_KEY,
          JSON.stringify({
            ...payload,
            template: template ? { ...template, b64: "" } : null,
          })
        );
      } catch {
        /* нет места — не критично */
      }
    }
  }, [template, records, active]);

  /* не даём браузеру открывать файлы, брошенные мимо зоны */
  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);

  /* живое превью */
  useEffect(() => {
    if (!template || !buffer || !active) {
      setHtml(null);
      return;
    }
    const rev = ++revRef.current;
    setPreviewBusy(true);
    const t = window.setTimeout(async () => {
      try {
        const blob = renderDocx(buffer, active.values);
        const ab = await blob.arrayBuffer();
        const h = await docxToHtml(ab);
        if (rev === revRef.current) setHtml(h);
      } catch (e) {
        console.error(e);
        if (rev === revRef.current)
          setHtml("<p>Не удалось построить превью документа.</p>");
      }
      if (rev === revRef.current) setPreviewBusy(false);
    }, 350);
    return () => window.clearTimeout(t);
  }, [template, buffer, active]);

  /* ---------- операции с шаблоном ---------- */

  const handleFile = useCallback(
    async (file: File) => {
      const name = file.name.toLowerCase();
      if (name.endsWith(".doc")) {
        toast(
          "error",
          "Старый формат .doc не поддерживается. Откройте файл в Word и сохраните как .docx."
        );
        return;
      }
      if (!name.endsWith(".docx")) {
        toast("error", "Нужен файл в формате .docx (Word). Другие форматы не поддерживаются.");
        return;
      }
      setFileBusy(true);
      try {
        const buf = await file.arrayBuffer();
        const tags = extractTags(buf);
        const firstId = uid();
        setTemplate({ fileName: file.name, b64: bufferToBase64(buf), tags });
        setRecords([{ id: firstId, values: {} }]);
        setActiveId(firstId);
        setStampKey(0);
        if (tags.length === 0) {
          toast(
            "info",
            "Плейсхолдеры вида {тег} не найдены — документ будет сохраняться без изменений."
          );
        } else {
          toast("success", `Шаблон «${file.name}» загружен. Найдено полей: ${tags.length}.`);
        }
      } catch (e) {
        console.error(e);
        toast("error", "Не удалось прочитать документ. Проверьте, что файл не повреждён.");
      } finally {
        setFileBusy(false);
      }
    },
    [toast]
  );

  const handleDemo = useCallback(() => {
    const blob = buildDemoTemplate();
    handleFile(new File([blob], DEMO_FILE_NAME, { type: DOCX_MIME }));
  }, [handleFile]);

  const handleReset = useCallback(() => {
    revRef.current++;
    setTemplate(null);
    const firstId = uid();
    setRecords([{ id: firstId, values: {} }]);
    setActiveId(firstId);
    setHtml(null);
    setStampKey(0);
    localStorage.removeItem(LS_KEY);
    persistedCache = null;
    toast("info", "Шаблон сброшен. Загрузите новый файл .docx.");
  }, [toast]);

  /* ---------- записи ---------- */

  const setValue = useCallback(
    (tag: string, value: string) => {
      setRecords((rs) =>
        rs.map((r) =>
          r.id === active.id ? { ...r, values: { ...r.values, [tag]: value } } : r
        )
      );
    },
    [active.id]
  );

  const clearRecord = useCallback(() => {
    setRecords((rs) => rs.map((r) => (r.id === active.id ? { ...r, values: {} } : r)));
    toast("info", "Поля записи очищены.");
  }, [active.id, toast]);

  const addRecord = useCallback(() => {
    const rec: FillRecord = { id: uid(), values: { ...active.values } };
    setRecords((rs) => [...rs, rec]);
    setActiveId(rec.id);
  }, [active.values]);

  const deleteRecord = useCallback(
    (id: string) => {
      const next = records.filter((r) => r.id !== id);
      setRecords(next);
      if (id === active.id) setActiveId(next[0]?.id ?? "");
      toast("info", "Запись удалена.");
    },
    [records, active.id, toast]
  );

  /* ---------- экспорт ---------- */

  const filledCount = useMemo(
    () =>
      template
        ? template.tags.filter((t) => (active.values[t] ?? "").trim().length > 0).length
        : 0,
    [template, active.values]
  );

  const downloadCurrent = useCallback(() => {
    if (!template || !buffer) return;
    try {
      const blob = renderDocx(buffer, active.values);
      const base = template.fileName.replace(/\.docx$/i, "");
      const slug = slugify(firstFilledValue(active, template.tags));
      downloadBlob(blob, `${base}_${slug || "заполненный"}.docx`);
      setStampKey((k) => k + 1);
      toast("success", "Договор сформирован и скачан.");
    } catch (e) {
      console.error(e);
      toast("error", "Не удалось сформировать документ.");
    }
  }, [template, buffer, active, toast]);

  const downloadAll = useCallback(async () => {
    if (!template || !buffer) return;
    try {
      const base = template.fileName.replace(/\.docx$/i, "");
      const files = await Promise.all(
        records.map(async (r, i) => {
          const blob = renderDocx(buffer, r.values);
          const slug = slugify(firstFilledValue(r, template.tags)) || `запись_${i + 1}`;
          return {
            name: `${String(i + 1).padStart(2, "0")}_${slug}.docx`,
            data: await blob.arrayBuffer(),
          };
        })
      );
      downloadBlob(makeZip(files), `${base}_все_договоры.zip`);
      setStampKey((k) => k + 1);
      toast("success", `Готово: ${records.length} договор(ов) упакованы в ZIP.`);
    } catch (e) {
      console.error(e);
      toast("error", "Не удалось собрать архив.");
    }
  }, [template, buffer, records, toast]);

  const titles = useMemo(
    () =>
      records.map((r, i) => {
        const v = template ? firstFilledValue(r, template.tags) : "";
        return v ? (v.length > 16 ? v.slice(0, 16) + "…" : v) : `Запись ${i + 1}`;
      }),
    [records, template]
  );

  const outName = template
    ? `${template.fileName.replace(/\.docx$/i, "")}_${
        slugify(firstFilledValue(active, template.tags)) || "заполненный"
      }.docx`
    : "";

  const kb = template ? Math.max(1, Math.round((template.b64.length * 3) / 4 / 1024)) : 0;

  /* ---------- разметка ---------- */

  return (
    <div className="bg-texture relative flex h-dvh flex-col overflow-hidden bg-pine-950">
      <Decor />

      {/* скрытый выбор файла (кнопки в разных местах) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-pine-800 bg-pine-900/80 px-4 sm:px-5">
        <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brass-400 font-mono text-[13px] font-bold text-pine-950 shadow-[0_4px_18px_rgba(237,166,60,0.35)]">
          <Braces size={18} strokeWidth={2.4} />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-[15px] font-bold leading-tight tracking-wide text-paper-50">
            ДОГОВОРНИК
          </h1>
          <p className="hidden font-mono text-[9px] uppercase tracking-[0.28em] text-pine-300 sm:block">
            word-шаблон → готовые договоры
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {template ? (
            <div className="flex items-center gap-2 rounded-md border border-pine-700 bg-pine-850/80 py-1.5 pl-2.5 pr-1.5">
              <FileText size={14} className="shrink-0 text-brass-300" />
              <span className="max-w-[130px] truncate text-[12px] font-medium text-paper-100 sm:max-w-[220px]">
                {template.fileName}
              </span>
              <span className="hidden font-mono text-[10px] tabular-nums text-pine-300 sm:inline">
                {template.tags.length} пол. · {kb} КБ
              </span>
              <button
                onClick={handleReset}
                title="Сбросить шаблон"
                className="grid h-6 w-6 place-items-center rounded text-pine-300 transition-colors hover:bg-pine-700 hover:text-red-300"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          ) : (
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-pine-400 sm:block">
              шаблон не загружен
            </span>
          )}
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        {/* ------- левая панель ------- */}
        <aside className="shrink-0 border-b border-pine-800 bg-pine-900/60 lg:w-[398px] lg:overflow-y-auto lg:border-b-0 lg:border-r xl:w-[430px]">
          <SectionHead num="01">Шаблон</SectionHead>
          <div className="px-5 pb-2">
            {template ? (
              <div className="anim-rise rounded-lg border border-pine-700 bg-pine-850/80 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-pine-800 text-brass-300">
                    <FileText size={19} strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-paper-50">
                      {template.fileName}
                    </p>
                    <p className="font-mono text-[10px] text-pine-300">
                      {template.tags.length} плейсхолдеров · {kb} КБ
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-pine-600 px-2.5 py-1.5 text-[12px] font-medium text-pine-100 transition-all hover:border-brass-400/70 hover:text-brass-300 active:scale-[0.98]"
                  >
                    <FolderOpen size={13} strokeWidth={1.8} />
                    Заменить файл
                  </button>
                  <button
                    onClick={handleDemo}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-pine-600 px-2.5 py-1.5 text-[12px] font-medium text-pine-100 transition-all hover:border-brass-400/70 hover:text-brass-300 active:scale-[0.98]"
                  >
                    Пример
                  </button>
                </div>
              </div>
            ) : (
              <Dropzone
                variant="compact"
                busy={fileBusy}
                onFile={handleFile}
                onDemo={handleDemo}
              />
            )}
          </div>

          <SectionHead num="02">Записи</SectionHead>
          <div className="px-5 pb-2">
            {template ? (
              <RecordsBar
                records={records}
                activeId={active.id}
                titles={titles}
                onSelect={setActiveId}
                onAdd={addRecord}
                onDelete={deleteRecord}
              />
            ) : (
              <div className="rounded-md border border-dashed border-pine-700/70 bg-pine-850/40 px-3.5 py-3 font-mono text-[10px] leading-relaxed text-pine-400">
                Несколько комплектов договора (например, на разных контрагентов)
                появятся после загрузки шаблона.
              </div>
            )}
          </div>

          <SectionHead num="03">Поля договора</SectionHead>
          <div className="px-5 pb-6">
            {template && template.tags.length > 0 ? (
              <FieldForm
                tags={template.tags}
                values={active.values}
                onChange={setValue}
                onClear={clearRecord}
              />
            ) : template ? (
              <div className="rounded-md border border-dashed border-pine-700/70 bg-pine-850/40 px-3.5 py-3 font-mono text-[10px] leading-relaxed text-pine-400">
                В этом шаблоне нет плейсхолдеров {"{…}"}. Добавьте их в Word —
                например {"{заказчик}"} — и загрузите файл заново.
              </div>
            ) : (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-[54px] rounded-md border border-dashed border-pine-700/60 bg-pine-850/30"
                  />
                ))}
                <p className="font-mono text-[10px] leading-relaxed text-pine-400">
                  Поля из {"{фигурных_скобок}"} шаблона автоматически появятся
                  здесь в виде формы.
                </p>
              </div>
            )}
          </div>

          {/* ------- экспорт (прилипающий) ------- */}
          <div className="sticky bottom-0 z-10 border-t border-pine-800 bg-pine-900 p-4 lg:bg-pine-900/95">
            <button
              onClick={downloadCurrent}
              disabled={!template}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brass-400 px-4 py-3 text-[14px] font-bold text-pine-950 transition-all duration-200 hover:bg-brass-300 hover:shadow-[0_8px_26px_rgba(237,166,60,0.35)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-brass-400 disabled:hover:shadow-none"
            >
              <FileDown size={17} strokeWidth={2.2} />
              Скачать .docx
            </button>
            {template && records.length > 1 && (
              <button
                onClick={downloadAll}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-pine-600 px-4 py-2.5 text-[13px] font-semibold text-pine-100 transition-all hover:border-brass-400/70 hover:text-brass-300 active:scale-[0.98]"
              >
                <Archive size={15} strokeWidth={1.8} />
                Все записи · {records.length} шт. (.zip)
              </button>
            )}
            <p className="mt-2 truncate text-center font-mono text-[10px] text-pine-400">
              {template ? outName : "сначала загрузите шаблон .docx"}
            </p>
          </div>
        </aside>

        {/* ------- превью ------- */}
        <main className="min-h-[72vh] flex-1 lg:min-h-0">
          <PreviewPane
            hasTemplate={!!template}
            fileName={template?.fileName ?? null}
            html={html}
            busy={previewBusy}
            filledCount={filledCount}
            totalCount={template?.tags.length ?? 0}
            stampKey={stampKey}
            onPickFile={() => fileInputRef.current?.click()}
            onDemo={handleDemo}
          />
        </main>
      </div>

      <Toasts toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
