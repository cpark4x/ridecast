declare module 'pdf-parse' {
  interface PdfData {
    text: string;
    numpages: number;
    numrender: number;
    info: Record<string, string>;
    metadata: unknown;
    version: string;
  }

  function pdfParse(buffer: Buffer): Promise<PdfData>;

  export default pdfParse;
}