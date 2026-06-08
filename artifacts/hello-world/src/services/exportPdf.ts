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

function addFooter(doc: jsPDF, font: string, pageNum: number, totalPages: number) {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;

  // Divider line
  doc.setDrawColor(255, 138, 0); // C.orange
  doc.setLineWidth(0.3);
  doc.line(12, pageHeight - 14, pageWidth - 12, pageHeight - 14);

  // Left: branding
  doc.setFont(font, "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 138, 0);
  doc.text("Powered by PageWise", 12, pageHeight - 8);

  // Center: URL
  doc.setFont(font, "normal");
  doc.setTextColor(150, 150, 150);
  doc.text("getpagewise.vercel.app", pageWidth / 2, pageHeight - 8, { align: "center" });

  // Right: page number
  doc.setFont(font, "normal");
  doc.setTextColor(150, 150, 150);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 12, pageHeight - 8, { align: "right" });
}

export function exportPdf(
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
  const font = theme.font || "helvetica";
  const textColor = theme.textColor || [0, 0, 0];
  const titleColor = theme.titleColor || [0, 0, 0];

  const ensurePage = (extra: number) => {
    if (y + extra > pageHeight - 20) { // ← 20 keeps space for footer
      doc.addPage();
      y = 15;
    }
  };

  const writeBlock = (label: string, text: string, isUser: boolean) => {
    const clean = stripMarkdown(text);
    const lines = doc.splitTextToSize(clean, maxWidth);
    ensurePage(10);
    doc.setFont(font, "bold");
    doc.setFontSize(11);
    doc.setTextColor(...(isUser ? titleColor : textColor));
    doc.text(label, margin, y);
    y += lineHeight;
    doc.setFont(font, "normal");
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
  doc.setFont(font, "bold");
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

  // Add footer to ALL pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, font, i, totalPages);
  }

  doc.save(fileName);
}