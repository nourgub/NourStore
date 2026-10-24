import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";

// Word (.docx) files have no real page numbers — pagination is a rendering
// artifact of font/margins/zoom at print time, never stored in the file.
// The only reliable signal is a *manual* page break the document's author
// explicitly inserted (Ctrl+Enter in Word), which docx stores as either an
// inline <w:br w:type="page"/> run or a <w:pageBreakBefore/> paragraph
// property. This module finds exactly those two markers (never Word's own
// <w:lastRenderedPageBreak/> hint, which is view-dependent and explicitly
// documented by Microsoft as unreliable for this purpose) and uses them —
// and only them — to split the document's text into "pages" a teacher can
// reference as "exercise 1 is on page 3".

export interface DocxPage {
  pageNumber: number;
  text: string;
}

const MAX_TEXT_PER_PAGE_CHARS = 8000; // same order of magnitude as extractText.ts's bound
const ELEMENT_NODE = 1;

function hasPageBreakBefore(paragraphNode: Element): boolean {
  const children = paragraphNode.childNodes;
  for (let i = 0; i < children.length; i++) {
    const child = children[i] as Element;
    if (child.nodeType !== ELEMENT_NODE) continue;
    if (child.nodeName === "w:pPr") {
      const pPrChildren = child.childNodes;
      for (let j = 0; j < pPrChildren.length; j++) {
        if ((pPrChildren[j] as Element).nodeName === "w:pageBreakBefore") return true;
      }
    }
  }
  return false;
}

function isManualPageBreakRun(node: Element): boolean {
  if (node.nodeName !== "w:br") return false;
  return node.getAttribute("w:type") === "page";
}

export async function splitDocxIntoPages(buffer: Buffer): Promise<DocxPage[]> {
  const zip = await JSZip.loadAsync(buffer);
  const documentXmlFile = zip.file("word/document.xml");
  if (!documentXmlFile) return [];
  const xml = await documentXmlFile.async("string");

  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const body = doc.getElementsByTagName("w:body")[0];
  if (!body) return [];

  const pages: string[] = [""];
  const appendText = (s: string) => {
    pages[pages.length - 1] += s;
  };
  const startNewPage = () => {
    // Never create a page that would stay empty — a break right at the
    // very start of the document (or two breaks in a row) must not shift
    // every later page number by one.
    if (pages[pages.length - 1].trim().length > 0) pages.push("");
  };

  function walk(node: Element) {
    if (node.nodeType !== ELEMENT_NODE) return;

    if (node.nodeName === "w:p" && hasPageBreakBefore(node)) {
      startNewPage();
    }

    const children = node.childNodes;
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as Element;
      if (child.nodeType !== ELEMENT_NODE) continue;

      if (child.nodeName === "w:t") {
        appendText(child.textContent || "");
        continue;
      }
      if (child.nodeName === "w:tab") {
        appendText("\t");
        continue;
      }
      if (isManualPageBreakRun(child)) {
        startNewPage();
        continue;
      }
      walk(child);
    }

    if (node.nodeName === "w:p") appendText("\n");
  }

  walk(body as unknown as Element);

  return pages
    .map((text, i) => ({ pageNumber: i + 1, text: text.trim().slice(0, MAX_TEXT_PER_PAGE_CHARS) }))
    .filter((p) => p.text.length > 0);
}
