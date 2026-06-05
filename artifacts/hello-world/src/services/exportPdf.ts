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
    const lines = doc.splitTextToSize(text, maxWidth);

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

  doc.setFont(font, "normal");
  doc.setFontSize(10);
  doc.setTextColor(...textColor);

  messages.forEach((msg) => {
    if (msg.role === "user") {
      writeBlock("You", msg.content, true);
    } else {
      writeBlock("PageWise AI", msg.content, false);
    }
  });

  doc.save(fileName);
}