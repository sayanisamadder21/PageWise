function parsePDF(file: File, resolve: (v: any) => void, reject: (e: any) => void) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const typedArray = new Uint8Array(e.target!.result as ArrayBuffer);
      const pdf = await (window as any).pdfjsLib.getDocument({ data: typedArray }).promise;
      let fullText = "";
      const totalPages = pdf.numPages;
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += `\n[Page ${i}]\n` + content.items.map((item: any) => item.str).join(" ") + "\n";
      }
      resolve({ text: fullText.trim(), pages: totalPages, words: fullText.trim().split(/\s+/).length });
    } catch (err) { reject(err); }
  };
  reader.onerror = reject;
  reader.readAsArrayBuffer(file);
}

export async function extractPDFText(
  file: File
): Promise<{ text: string; pages: number; words: number }> {
  return new Promise((resolve, reject) => {
    if (!(window as any).pdfjsLib) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        parsePDF(file, resolve, reject);
      };
      script.onerror = () => reject(new Error("Failed to load PDF parser"));
      document.head.appendChild(script);
    } else {
      parsePDF(file, resolve, reject);
    }
  });
}
