import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import mammoth from "mammoth/mammoth.browser";

export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Достаёт из .docx все плейсхолдеры вида {тег} в порядке появления.
 * Прогоняем рендер с прокси-объектом: docxtemplater сам «склеивает» теги,
 * разбитые Word на несколько xml-ранов, и сообщает, какие ключи запрашивает.
 */
export function extractTags(buffer: ArrayBuffer): string[] {
  const zip = new PizZip(buffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
  });
  const found = new Set<string>();
  const probe = new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop === "string" && !prop.startsWith("$")) {
          found.add(prop);
        }
        return undefined;
      },
      has: () => true,
    }
  );
  doc.render(probe);
  return Array.from(found);
}

/** Подставляет значения и возвращает готовый .docx как Blob. */
export function renderDocx(
  buffer: ArrayBuffer,
  values: Record<string, string>
): Blob {
  const zip = new PizZip(buffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
  });
  doc.render(values);
  return doc.getZip().generate({
    type: "blob",
    mimeType: DOCX_MIME,
    compression: "DEFLATE",
  }) as unknown as Blob;
}

/** Превью документа: .docx -> HTML. */
export async function docxToHtml(buffer: ArrayBuffer): Promise<string> {
  const res = await mammoth.convertToHtml({ arrayBuffer: buffer });
  return res.value;
}

/** Собирает несколько файлов в один .zip. */
export function makeZip(
  files: Array<{ name: string; data: ArrayBuffer }>
): Blob {
  const zip = new PizZip();
  for (const f of files) zip.file(f.name, f.data);
  return zip.generate({
    type: "blob",
    mimeType: "application/zip",
    compression: "DEFLATE",
  }) as unknown as Blob;
}

/** Скачивание blob'а в браузере. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1200);
}

/* ---------- base64 для localStorage ---------- */

export function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk))
    );
  }
  return btoa(bin);
}

export function base64ToBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/* ---------- человекочитаемые подписи ---------- */

export function humanizeTag(tag: string): string {
  const s = tag.replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function slugify(s: string, max = 28): string {
  const cleaned = s
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "_")
    .slice(0, max)
    .trim();
  return cleaned || "";
}

/* ---------- демонстрационный шаблон ---------- */

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;

function p(text: string, opts: { bold?: boolean; center?: boolean; size?: number } = {}): string {
  const jc = opts.center ? "<w:jc w:val=\"center\"/>" : "";
  const rpr =
    (opts.bold || opts.size
      ? `<w:rPr>${opts.bold ? "<w:b/>" : ""}${
          opts.size ? `<w:sz w:val="${opts.size}"/>` : ""
        }</w:rPr>`
      : "");
  return `<w:p><w:pPr>${jc}<w:spacing w:after="120"/></w:pPr><w:r>${rpr}<w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
}

export const DEMO_FILE_NAME = "Пример — договор оказания услуг.docx";

/** Собирает валидный .docx с русскоязычным шаблоном договора. */
export function buildDemoTemplate(): Blob {
  const body = [
    p("ДОГОВОР ОКАЗАНИЯ УСЛУГ № {номер_договора}", { bold: true, center: true, size: 30 }),
    p("г. {город}                                                                    {дата_заключения}"),
    p(
      "{заказчик_наименование}, именуемое в дальнейшем «Заказчик», в лице {заказчик_лицо}, " +
        "действующего на основании {заказчик_основание}, с одной стороны, и " +
        "{исполнитель_наименование}, именуемое в дальнейшем «Исполнитель», в лице {исполнитель_лицо}, " +
        "действующего на основании Устава, с другой стороны, совместно именуемые «Стороны», " +
        "заключили настоящий Договор о нижеследующем."
    ),
    p("1. ПРЕДМЕТ ДОГОВОРА", { bold: true }),
    p(
      "1.1. Исполнитель обязуется оказать Заказчику следующие услуги: {предмет_договора}, " +
        "а Заказчик обязуется принять и оплатить оказанные услуги в порядке и на условиях настоящего Договора."
    ),
    p("1.2. Услуги оказываются в соответствии с требованиями, согласованными Сторонами, и действующим законодательством Российской Федерации."),
    p("2. СТОИМОСТЬ И ПОРЯДОК РАСЧЁТОВ", { bold: true }),
    p("2.1. Стоимость услуг по настоящему Договору составляет {стоимость_услуг}."),
    p("2.2. Оплата производится Заказчиком в течение 5 (пяти) рабочих дней с момента подписания Сторонами Акта об оказании услуг."),
    p("3. СРОКИ ОКАЗАНИЯ УСЛУГ", { bold: true }),
    p("3.1. Исполнитель обязуется оказать услуги в срок до {срок_оказания}."),
    p("4. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ", { bold: true }),
    p("4.1. Настоящий Договор вступает в силу с момента его подписания Сторонами и действует до полного исполнения Сторонами своих обязательств."),
    p("4.2. Договор составлен в двух экземплярах, имеющих равную юридическую силу, по одному для каждой из Сторон."),
    p("РЕКВИЗИТЫ И ПОДПИСИ СТОРОН", { bold: true }),
    p("Заказчик: {заказчик_реквизиты}"),
    p("Исполнитель: {исполнитель_реквизиты}"),
    p("____________ / {заказчик_лицо} /                          ____________ / {исполнитель_лицо} /"),
  ].join("");

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`;

  const zip = new PizZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES);
  zip.file("_rels/.rels", ROOT_RELS);
  zip.file("word/document.xml", documentXml);
  zip.file("word/_rels/document.xml.rels", DOC_RELS);
  return zip.generate({
    type: "blob",
    mimeType: DOCX_MIME,
    compression: "DEFLATE",
  }) as unknown as Blob;
}
