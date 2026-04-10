const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");

const SOURCE_PDF = "weddingpix_sum.pdf";
const PART_PREFIX = "weddingpix_part";
const MANIFEST_FILE = "weddingpix_parts.json";
const DEFAULT_MAX_PART_SIZE_MB = 95;

function resolveMaxPartSizeMb() {
  const arg = process.argv.find((value) => value.startsWith("--max-mb="));
  const env = process.env.MAX_PART_SIZE_MB;
  const raw = arg ? arg.split("=")[1] : env;
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_MAX_PART_SIZE_MB;
}

function formatMb(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function buildChunk(pdf, startPage, endPage) {
  const outPdf = await PDFDocument.create();
  const indices = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );
  const copiedPages = await outPdf.copyPages(pdf, indices);
  copiedPages.forEach((page) => outPdf.addPage(page));
  return outPdf.save();
}

async function main() {
  const maxPartSizeMb = resolveMaxPartSizeMb();
  const maxPartSizeBytes = maxPartSizeMb * 1024 * 1024;

  if (!fs.existsSync(SOURCE_PDF)) {
    throw new Error(`Source file not found: ${SOURCE_PDF}`);
  }

  const sourceBytes = fs.readFileSync(SOURCE_PDF);
  const sourcePdf = await PDFDocument.load(sourceBytes);
  const totalPages = sourcePdf.getPageCount();
  const sourceSize = fs.statSync(SOURCE_PDF).size;
  const parts = [];

  // Remove prior generated outputs so manifest and files stay in sync.
  const existingPartFiles = fs
    .readdirSync(process.cwd())
    .filter((name) => new RegExp(`^${PART_PREFIX}\\d+\\.pdf$`).test(name));
  existingPartFiles.forEach((file) => fs.unlinkSync(file));
  if (fs.existsSync(MANIFEST_FILE)) fs.unlinkSync(MANIFEST_FILE);

  console.log(`Source: ${SOURCE_PDF}`);
  console.log(`Pages: ${totalPages}`);
  console.log(`Size: ${formatMb(sourceSize)}`);
  console.log(`Max part size: ${maxPartSizeMb} MB\n`);

  let cursor = 0;
  let partNumber = 1;

  while (cursor < totalPages) {
    let best = null;

    for (let end = cursor; end < totalPages; end += 1) {
      const bytes = await buildChunk(sourcePdf, cursor, end);
      const size = bytes.byteLength;

      if (size <= maxPartSizeBytes) {
        best = { startPage: cursor, endPage: end, bytes, size };
      } else if (end === cursor) {
        // Single page is already too large; still emit it so the process completes.
        best = { startPage: cursor, endPage: end, bytes, size };
        console.warn(
          `Warning: page ${cursor + 1} is larger than ${maxPartSizeMb} MB by itself (${formatMb(
            size
          )}).`
        );
      } else {
        break;
      }
    }

    if (!best) {
      throw new Error(`Could not build a valid chunk starting at page ${cursor + 1}.`);
    }

    const filename = `${PART_PREFIX}${String(partNumber).padStart(2, "0")}.pdf`;
    fs.writeFileSync(filename, Buffer.from(best.bytes));

    parts.push({
      file: filename,
      startPage: best.startPage + 1,
      endPage: best.endPage + 1,
      sizeBytes: best.size,
    });

    console.log(
      `${filename}: pages ${best.startPage + 1}-${best.endPage + 1} (${formatMb(best.size)})`
    );

    cursor = best.endPage + 1;
    partNumber += 1;
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    sourcePdf: path.basename(SOURCE_PDF),
    sourceSizeBytes: sourceSize,
    totalPages,
    maxPartSizeBytes: maxPartSizeBytes,
    parts,
  };

  fs.writeFileSync(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const totalPartsBytes = parts.reduce((acc, p) => acc + p.sizeBytes, 0);
  console.log(`\nWrote ${parts.length} part file(s).`);
  console.log(`Combined part size: ${formatMb(totalPartsBytes)}`);
  console.log(`Manifest: ${MANIFEST_FILE}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
