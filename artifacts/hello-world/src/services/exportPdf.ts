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
    if (y + extra > pageHeight - margin) {
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

  doc.save(fileName);
}