declare module 'mammoth' {
  interface ExtractResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }

  function extractRawText(options: { buffer: Buffer }): Promise<ExtractResult>;

  const mammoth: { extractRawText: typeof extractRawText };
  export default mammoth;
}