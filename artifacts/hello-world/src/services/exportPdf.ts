import { pdf } from "@react-pdf/renderer";
import PdfDocument from "./PdfDocument";
import React from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export async function exportPdf(
  messages: Message[],
  fileName = "pagewise-export.pdf"
) {
  const element = React.createElement(PdfDocument, { messages });
  const instance = pdf();
  instance.updateContainer(element);
  const blob = await instance.toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}