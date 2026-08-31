// pdfmake 0.3 无内置类型声明，此处提供本项目所需的最小类型
declare module 'pdfmake/interfaces' {
  export type Content = any;
  export interface TDocumentDefinitions {
    info?: any;
    pageSize?: any;
    pageMargins?: any;
    content: Content[];
    defaultStyle?: any;
  }
}

declare module 'pdfmake/build/pdfmake' {
  const pdfMake: {
    virtualfs: { writeFileSync(filename: string, content: string, encoding?: string): void };
    fonts: Record<string, Record<string, string>>;
    createPdf(doc: any): { download(name: string): Promise<void> };
  };
  export default pdfMake;
}
