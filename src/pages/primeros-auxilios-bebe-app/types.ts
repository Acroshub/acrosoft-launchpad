export type Stage = "0-3" | "3-6" | "6-12";

export interface LibraryItem {
  id: string;
  title: string;
  description: string;
  kind: "ebook" | "bono";
  /** Nombre sugerido al descargar. */
  filename: string;
  /** false = el PDF aún no se ha cargado en el paquete. */
  available: boolean;
  bytes?: number;
  /** true = PDF de prueba generado por el build (no es el contenido real). */
  demo?: boolean;
}

/** Lo que va cifrado en content.bin. */
export interface PackContent {
  library: LibraryItem[];
  /** Solo cliente: se abrió sin conexión; la Biblioteca no está disponible. */
  offline?: boolean;
}

export interface PackMeta {
  v: string;
  kdf: string;
  iter: number;
  salt: string;
}
