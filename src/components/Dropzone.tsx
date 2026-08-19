import { useRef, useState, type DragEvent } from "react";
import { FileUp, FileText, Loader2, FlaskConical } from "lucide-react";

interface Props {
  onFile: (file: File) => void;
  onDemo: () => void;
  busy: boolean;
  variant: "hero" | "compact";
}

export default function Dropzone({ onFile, onDemo, busy, variant }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  const open = () => inputRef.current?.click();

  const hero = variant === "hero";

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") open();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        className={[
          "group relative cursor-pointer rounded-lg border-2 border-dashed transition-all duration-300 outline-none",
          hero ? "px-8 py-14 sm:py-16 text-center" : "px-4 py-6 text-center",
          drag
            ? "border-brass-400 bg-brass-400/10 scale-[1.015] shadow-[0_0_0_4px_rgba(237,166,60,0.15)]"
            : "border-pine-600 bg-pine-850/60 hover:border-brass-400/70 hover:bg-pine-850",
          "focus-visible:ring-2 focus-visible:ring-brass-400",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
        <div
          className={[
            "mx-auto grid place-items-center rounded-md transition-all duration-300",
            hero ? "w-14 h-14 mb-5" : "w-11 h-11 mb-3",
            drag
              ? "bg-brass-400 text-pine-950 -translate-y-1"
              : "bg-pine-800 text-brass-300 group-hover:-translate-y-0.5 group-hover:bg-pine-700",
          ].join(" ")}
        >
          {busy ? (
            <Loader2 size={hero ? 26 : 20} className="animate-spin" />
          ) : (
            <FileUp size={hero ? 26 : 20} strokeWidth={1.8} />
          )}
        </div>
        <p className={["font-semibold text-paper-50", hero ? "text-lg" : "text-sm"].join(" ")}>
          {busy
            ? "Читаем документ…"
            : drag
              ? "Отпустите файл"
              : "Перетащите сюда шаблон .docx"}
        </p>
        <p className="mt-1.5 font-mono text-[11px] text-pine-300">
          или нажмите, чтобы выбрать файл · поля {"{в_фигурных_скобках}"} станут формой
        </p>
      </div>

      <button
        onClick={onDemo}
        disabled={busy}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-pine-700 bg-transparent px-3 py-2.5 text-[13px] font-medium text-pine-200 transition-all hover:border-brass-400/60 hover:text-brass-300 active:scale-[0.99] disabled:opacity-50"
      >
        <FlaskConical size={15} strokeWidth={1.8} />
        Открыть пример шаблона
      </button>
    </div>
  );
}

export function TemplateFileIcon() {
  return <FileText size={20} strokeWidth={1.8} />;
}
