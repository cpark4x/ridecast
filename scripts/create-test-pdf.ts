import { writeFileSync } from "fs";
import path from "path";

function buildPdf(): Buffer {
  const parts: Buffer[] = [];
  const offsets: Record<number, number> = {};
  let pos = 0;

  function w(s: string): void {
    const b = Buffer.from(s, "latin1");
    parts.push(b);
    pos += b.length;
  }

  function markObj(n: number): void {
    offsets[n] = pos;
  }

  function pad10(n: number): string {
    return String(n).padStart(10, "0");
  }

  w("%PDF-1.4\n");

  markObj(1);
  w("1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n");

  markObj(2);
  w("2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n");

  markObj(3);
  w(
    "3 0 obj\n" +
      "<</Type /Page /MediaBox [0 0 612 792] /Parent 2 0 R" +
      " /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>>\n" +
      "endobj\n",
  );

  const streamData =
    "BT /F1 12 Tf 72 720 Td " +
    "(Ridecast E2E test fixture. " +
    "The quick brown fox jumps over the lazy dog. " +
    "Pack my box with five dozen liquor jugs. " +
    "How vexingly quick daft zebras jump.) Tj ET";

  markObj(4);
  w(
    `4 0 obj\n<</Length ${Buffer.byteLength(streamData, "latin1")}>>\n` +
      `stream\n${streamData}\nendstream\nendobj\n`,
  );

  markObj(5);
  w(
    "5 0 obj\n" +
      "<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>\n" +
      "endobj\n",
  );

  const xrefPos = pos;
  w(
    "xref\n" +
      "0 6\n" +
      "0000000000 65535 f \n" +
      `${pad10(offsets[1])} 00000 n \n` +
      `${pad10(offsets[2])} 00000 n \n` +
      `${pad10(offsets[3])} 00000 n \n` +
      `${pad10(offsets[4])} 00000 n \n` +
      `${pad10(offsets[5])} 00000 n \n`,
  );

  w(`trailer\n<</Size 6 /Root 1 0 R>>\nstartxref\n${xrefPos}\n%%EOF\n`);

  return Buffer.concat(parts);
}

const outPath = path.resolve(__dirname, "../test-fixtures/sample.pdf");
const pdf = buildPdf();
writeFileSync(outPath, pdf);
console.log(`Created ${outPath} (${pdf.length} bytes)`);
