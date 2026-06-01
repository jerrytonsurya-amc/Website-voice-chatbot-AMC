import fs from "fs";
import path from "path";
import { parseOffice } from "officeparser";
import { PDFParse } from "pdf-parse";

const SOURCE_DIR = path.join(process.cwd(), "data/market-mantra-source/Monthly Market Mantra");
const OUTPUT_FILE = path.join(process.cwd(), "data/market-mantra-knowledge.txt");

function cleanText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function formatTables(tableResult: any): string {
  if (!tableResult?.tables?.length) return "";

  const blocks: string[] = ["TABLE DATA:"];

  for (const table of tableResult.tables) {
    if (Array.isArray(table)) {
      for (const row of table) {
        if (Array.isArray(row)) {
          blocks.push(row.map((cell) => String(cell ?? "").trim()).join(" | "));
        } else {
          blocks.push(String(row));
        }
      }
      blocks.push("");
    } else if (typeof table === "object" && table !== null) {
      blocks.push(JSON.stringify(table));
      blocks.push("");
    }
  }

  return cleanText(blocks.join("\n"));
}

async function extractPdf(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: buffer });

  try {
    const textResult = await parser.getText();
    let content = cleanText(textResult.text || "");

    try {
      const tableResult = await parser.getTable();
      const tableText = formatTables(tableResult);
      if (tableText) {
        content = `${content}\n\n${tableText}`;
      }
    } catch {
      // Some PDFs may not expose structured tables; keep text-only extraction.
    }

    return content;
  } finally {
    await parser.destroy();
  }
}

async function extractPptx(filePath: string): Promise<string> {
  const ast = await parseOffice(filePath);
  const text = ast.toText();

  const tableBlocks: string[] = [];
  const walk = (node: any) => {
    if (!node) return;
    if (node.type === "table" && Array.isArray(node.children)) {
      for (const row of node.children) {
        if (!Array.isArray(row?.children)) continue;
        const cells = row.children.map((cell: any) => {
          const cellText = typeof cell?.toText === "function" ? cell.toText() : String(cell?.text || "");
          return cellText.trim();
        });
        if (cells.some(Boolean)) {
          tableBlocks.push(cells.join(" | "));
        }
      }
      tableBlocks.push("");
    }
    if (Array.isArray(node.children)) {
      node.children.forEach(walk);
    }
  };

  walk(ast.content);

  const tableText = tableBlocks.length ? `\n\nTABLE DATA:\n${tableBlocks.join("\n")}` : "";
  return cleanText(`${text}${tableText}`);
}

async function extractFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    return extractPdf(filePath);
  }

  if (ext === ".pptx" || ext === ".ppt") {
    return extractPptx(filePath);
  }

  return "";
}

async function main() {
  if (!fs.existsSync(SOURCE_DIR)) {
    throw new Error(`Source directory not found: ${SOURCE_DIR}`);
  }

  const files = fs
    .readdirSync(SOURCE_DIR)
    .filter((name) => /\.(pdf|pptx|ppt)$/i.test(name))
    .sort();

  if (files.length === 0) {
    throw new Error("No PDF or PPTX files found in source directory.");
  }

  const sections: string[] = [
    "SHRIRAM AMC MONTHLY MARKET MANTRA KNOWLEDGE BASE",
    "Extracted from Monthly Market Mantra PDF and PPT reports.",
    "Use this content for market outlook, macro trends, sector views, index performance tables, and Shriram AMC research insights.",
    "",
  ];

  for (const fileName of files) {
    const filePath = path.join(SOURCE_DIR, fileName);
    console.log(`Extracting: ${fileName}`);

    try {
      const text = await extractFile(filePath);
      if (!text) {
        console.warn(`  No text extracted from ${fileName}`);
        continue;
      }

      sections.push("=".repeat(80));
      sections.push(`DOCUMENT: ${fileName}`);
      sections.push("=".repeat(80));
      sections.push(text);
      sections.push("");
      console.log(`  Extracted ${text.length} characters`);
    } catch (error) {
      console.error(`  Failed to extract ${fileName}:`, error);
    }
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, sections.join("\n"), "utf8");
  console.log(`\nKnowledge base written to ${OUTPUT_FILE}`);
  console.log(`Total size: ${sections.join("\n").length} characters`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
