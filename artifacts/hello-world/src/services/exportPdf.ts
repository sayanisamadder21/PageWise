import jsPDF from "jspdf";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ExportTheme = {
  font?: "helvetica" | "times" | "courier";
  textColor?: [number, number, number];
  titleColor?: [number, number, number];
};

// Noto Sans covers Latin, Devanagari, Bengali, Tamil, Telugu, Kannada,
// Malayalam, Thai, Japanese, Chinese, Korean, Arabic, and more.
const NOTO_SANS_URL =
  "https://fonts.gstatic.com/s/notosans/v36/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A-9a6Vc.ttf";

async function loadNotoSansBase64(): Promise<string> {
  const response = await fetch(NOTO_SANS_URL);
  if (!response.ok) throw new Error("Failed to fetch Noto Sans font");
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/`{1,3}(.*?)`{1,3}/gs, "$1")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, (m) => m.trim() + " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/---+/g, "")
    .trim();
}

function addFooter(
  doc: jsPDF,
  fontName: string,
  pageNum: number,
  totalPages: number
) {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;

  doc.setDrawColor(255, 138, 0);
  doc.setLineWidth(0.3);
  doc.line(12, pageHeight - 14, pageWidth - 12, pageHeight - 14);

  doc.setFont(fontName, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 138, 0);
  doc.text("Powered by PageWise", 12, pageHeight - 8);

  doc.setTextColor(150, 150, 150);
  doc.text("getpagewise.vercel.app", pageWidth / 2, pageHeight - 8, {
    align: "center",
  });

  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 12, pageHeight - 8, {
    align: "right",
  });
}

export async function exportPdf(
  messages: Message[],
  fileName = "document.pdf",
  theme: ExportTheme = {}
) {
  const doc = new jsPDF();
  const margin = 12;
  const maxWidth = 180;
  const lineHeight = 7;
  let y = 15;
  const pageHeight = doc.internal.pageSize.height;
  const textColor = theme.textColor || [40, 40, 40];
  const titleColor = theme.titleColor || [0, 0, 0];

  // --- Load and register Unicode font ---
  // Falls back to helvetica if the font fetch fails (e.g. offline)
  let fontName: string = theme.font || "helvetica";
  try {
    const base64Font = await loadNotoSansBase64();
    doc.addFileToVFS("NotoSans-Regular.ttf", base64Font);
    doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
    // jsPDF doesn't support bold TTF unless you load a separate bold TTF.
    // Register the same file as "bold" so bold calls don't throw.
    doc.addFont("NotoSans-Regular.ttf", "NotoSans", "bold");
    fontName = "NotoSans";
  } catch (e) {
    console.warn("Could not load Noto Sans font, falling back to helvetica:", e);
    fontName = theme.font || "helvetica";
  }

  const ensurePage = (extra: number) => {
    if (y + extra > pageHeight - 20) {
      doc.addPage();
      y = 15;
    }
  };

  const writeBlock = (label: string, text: string, isUser: boolean) => {
    const clean = stripMarkdown(text);
    const lines = doc.splitTextToSize(clean, maxWidth);
    ensurePage(10);

    doc.setFont(fontName, "bold");
    doc.setFontSize(11);
    doc.setTextColor(...(isUser ? titleColor : textColor));
    doc.text(label, margin, y);
    y += lineHeight;

    doc.setFont(fontName, "normal");
    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    for (const line of lines) {
      ensurePage(lineHeight);
      doc.text(line, margin, y);
      y += lineHeight;
    }
    y += 4;
  };

  // Header
  doc.setFont(fontName, "bold");
  doc.setFontSize(14);
  doc.setTextColor(...titleColor);
  doc.text("PageWise Export", margin, y);
  y += 10;

  messages.forEach((msg) => {
    if (msg.role === "user") {
      writeBlock("You", msg.content, true);
    } else {
      writeBlock("PageWise AI", msg.content, false);
    }
  });

  // Footer on all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, fontName, i, totalPages);
  }

  doc.save(fileName);
}