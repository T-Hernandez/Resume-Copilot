import * as os from 'os';
import * as path from 'path';
import { createWorker } from 'tesseract.js';
import { getDocumentProxy, renderPageAsImage, definePDFJSModule } from 'unpdf';

// A scanned/photographed resume (no text layer at all - the PDF is just a
// raster image of a page) is invisible to extractTextFromPdf's normal path:
// pdfjs's getTextContent() returns zero items for a page with no real text
// objects, no matter how good the column-aware reconstruction is, because
// there is no text to reconstruct. This is the one path in the codebase
// that actually reads pixels instead of text objects - tried only as a
// last resort (see extract-text.ts), since it is far slower than normal
// extraction and OCR is inherently approximate, never a source of new
// facts the way real embedded text is.
//
// unpdf + @napi-rs/canvas render each page to a raster image; tesseract.js
// (pure WebAssembly, no native compile step, unlike node-canvas which needs
// a full build toolchain on Alpine/musl) then reads the image. Rendering
// requires the *official* pdfjs-dist build (unpdf ships its own bundled
// build by default, which renderPageAsImage cannot use) - definePDFJSModule
// points it at the same pdfjs-dist/legacy build already used for real
// column-aware extraction, so there is exactly one pdfjs build in play.

let pdfjsModuleReady: Promise<void> | undefined;
function ensurePdfjsModule(): Promise<void> {
  pdfjsModuleReady ??= definePDFJSModule(() => import('pdfjs-dist/legacy/build/pdf.mjs'));
  return pdfjsModuleReady;
}

// tesseract.js defaults to caching its downloaded language data (tens of MB
// per language) in the current working directory - fine for a script, but
// would drop .traineddata files into the deployed app's own directory
// (and, in local dev, into this git working tree) on first use. Pointed at
// the OS temp dir instead, so it never touches the project directory; the
// cache is lost on a fresh container (Render redeploy, dev machine reboot)
// the same way any other /tmp content is, which just means the first OCR
// call after a fresh start re-downloads it - an accepted cost of choosing a
// local, no-API-key OCR library over a paid vision API.
const TESSERACT_CACHE_PATH = path.join(os.tmpdir(), 'resume-copilot-tesseract-cache');

// English and Spanish cover this project's actual audience (see README) -
// not an attempt at exhaustive language coverage. Recognizing the wrong
// language reads as low-quality OCR text, not a crash, so this degrades
// gracefully for a resume in a third language rather than failing outright.
const OCR_LANGUAGES = 'eng+spa';

// No real resume runs this long - a cap protects the (already rate-limited,
// see api/server.ts) request from a pathological upload turning a few
// seconds of OCR into several minutes of it on a public deployment's free
// compute tier.
const MAX_OCR_PAGES = 10;

export async function extractTextViaOcr(buffer: Buffer): Promise<string> {
  await ensurePdfjsModule();
  const napiCanvas = await import('@napi-rs/canvas');
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const worker = await createWorker(OCR_LANGUAGES, undefined, { cachePath: TESSERACT_CACHE_PATH });

  try {
    const pageTexts: string[] = [];
    const pageCount = Math.min(pdf.numPages, MAX_OCR_PAGES);
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
      const image = await renderPageAsImage(pdf, pageNumber, {
        canvasImport: () => Promise.resolve(napiCanvas),
        scale: 2
      });
      const result = await worker.recognize(Buffer.from(image));
      const text = result.data.text.trim();
      if (text) pageTexts.push(text);
    }
    return pageTexts.join('\n\n');
  } finally {
    await worker.terminate();
  }
}
