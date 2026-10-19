export const LIBRARY: { id: string; kind: "ebook" | "bono"; title: string; description: string; filename: string; match: RegExp }[];
export function assignPdfs(files: string[], library?: typeof LIBRARY): Map<string, string>;
export function demoPdf(title: string): Buffer;
