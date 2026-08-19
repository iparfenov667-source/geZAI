export interface TemplateState {
  fileName: string;
  b64: string;
  tags: string[];
}

export interface FillRecord {
  id: string;
  values: Record<string, string>;
}

export interface ToastItem {
  id: number;
  kind: "success" | "error" | "info";
  text: string;
}
