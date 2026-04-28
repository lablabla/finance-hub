import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export async function extractText(buffer) {
  const data = await pdfParse(buffer);
  return { text: data.text, pages: data.numpages };
}
