// Catálogo de productos ebook vendidos vía Stripe Payment Link (landing
// pública, sin tenant de CRM detrás). Un slug por producto — hoy solo
// "delf-a2", pero deja lugar para más ebooks sin tocar stripe-webhook ni
// frances-get-order.

export type EbookProduct = { name: string; filename: string; storagePath: string };

export const EBOOK_STORAGE_BUCKET = "ebook-deliverables";

// Un solo ZIP por producto (guía + bonos adentro) — un único botón de
// descarga en /ty-frances en vez de un botón por archivo.
export const EBOOK_CATALOG: Record<string, EbookProduct> = {
  "delf-a2": {
    name: "Guía para Aprobar tu Examen DELF A2 + 4 Bonos",
    filename: "DELF-A2-Guia-Completa-Bonos.zip",
    storagePath: "delf-a2/DELF-A2-Guia-Completa-Bonos.zip",
  },
};
