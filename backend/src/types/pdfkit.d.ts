declare module 'pdfkit' {
  import { Writable } from 'stream'
  const PDFDocument: {
    new (options?: any): {
      pipe: (dest: Writable) => void
      fontSize: (size: number) => any
      text: (text: string, options?: any) => any
      moveDown: (lines?: number) => any
      end: () => void
    }
  }
  export default PDFDocument
}

