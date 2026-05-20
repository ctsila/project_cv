import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import fs from 'fs';
import path from 'path';

const pdfFontPath = path.join(process.cwd(), 'public', 'fonts', 'OpenSans-VariableFont_wdth,wght.ttf');

function applyPdfFont(doc: PDFDocument) {
  if (fs.existsSync(pdfFontPath)) {
    doc.registerFont('main', pdfFontPath);
    doc.font('main');
  }
}

export async function renderPdfBuffer(title: string, content: string): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
  applyPdfFont(doc);
  doc.fontSize(18).text(title || 'AI Resume Export', { underline: false });
  doc.moveDown();
  doc.fontSize(10).text(content || '', { lineGap: 4 });
  doc.end();
  return done;
}

export async function renderDocxBuffer(title: string, content: string): Promise<Buffer> {
  const paragraphs = [new Paragraph({ children: [new TextRun({ text: title || 'AI Resume Export', bold: true, size: 30 })] })];
  for (const line of (content || '').split('\n')) paragraphs.push(new Paragraph({ text: line }));
  const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });
  return Buffer.from(await Packer.toBuffer(doc));
}
