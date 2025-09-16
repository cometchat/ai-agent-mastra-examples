declare module 'pdf-parse' {
  interface PDFInfo {
    numpages: number;
    numrender: number;
    info: Record<string, any>;
    metadata?: any;
    version?: string;
    text?: string;
  }
  interface PDFResult extends PDFInfo {
    text: string;
  }
  function pdf(dataBuffer: Buffer | Uint8Array, options?: any): Promise<PDFResult>;
  export = pdf;
}