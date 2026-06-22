export const SUGGESTIONS: string[] = [
  "Summarize in 3 bullet points",
  "What are the key takeaways?",
  "List all action items",
  "Extract all dates and deadlines",
  "Explain in simple language",
  "What problems does this solve?",
];

export const AUTO_PROMPTS: Record<string, string> = {
  insights:   "Extract the key insights from this document",
  studynotes: "Generate comprehensive study notes from this document",
  examgen:    "Generate exam questions from this document",
  summarizer: "Give me a TL;DR summary in 5 bullet points",
};

export const PERSONA_SUGGESTIONS: Record<string, string[]> = {
  analyst: [
    "Summarize key findings",
    "What are the main arguments?",
    "List all action items",
    "What conclusions are drawn?",
  ],
  teacher: [
    "Explain this in simple terms",
    "What are the core concepts?",
    "Give me 3 key takeaways",
    "What should a beginner know?",
  ],
  lawyer: [
    "What are the key legal terms?",
    "Summarize the obligations",
    "What are the risks in this document?",
    "List all deadlines and dates",
  ],
  doctor: [
    "Summarize the key conditions covered",
    "What treatments are mentioned?",
    "List all drugs or dosages",
    "What are the diagnostic criteria?",
  ],
};
