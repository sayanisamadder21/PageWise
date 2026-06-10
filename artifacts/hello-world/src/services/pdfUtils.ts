export type PDFMessage = {
  role: "user" | "assistant";
  text: string;
};

export function cleanText(input: string): string {
  return input
    .replace(/\*\*(.*?)\*\*/g, "$1") // bold
    .replace(/\*(.*?)\*/g, "$1")     // italics
    .replace(/`{3}[\s\S]*?`{3}/g, (m) => m.replace(/```/g, "")) // code blocks
    .trim();
}

export function splitIntoBlocks(text: string) {
  const lines = cleanText(text).split("\n");

  const blocks: { type: string; content: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      blocks.push({ type: "space", content: "" });
      continue;
    }

    if (trimmed.startsWith("###")) {
      blocks.push({ type: "h3", content: trimmed.replace("###", "").trim() });
    } else if (trimmed.startsWith("##")) {
      blocks.push({ type: "h2", content: trimmed.replace("##", "").trim() });
    } else if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
      blocks.push({ type: "bullet", content: trimmed.replace(/^[-*]\s*/, "") });
    } else {
      blocks.push({ type: "p", content: trimmed });
    }
  }

  return blocks;
}

export function buildPDFContent(messages: PDFMessage[]) {
  return messages
    .filter(m => m.role === "assistant" || m.role === "user")
    .map(m => ({
      role: m.role,
      blocks: splitIntoBlocks(m.text),
    }));
}