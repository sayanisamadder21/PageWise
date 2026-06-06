export type Tier = "free" | "starter" | "pro";

export interface TierConfig {
  name: string;

  // Usage Limits
  dailyQuestions: number;
  pdfsPerDay?: number;
  unlimitedPdfs: boolean;
  maxContextChars: number;

  // Features
  chatHistory: boolean;
  pdfExport: boolean;
  customMode: boolean;
  hipaaMode: boolean;
  search: boolean;
  folders: boolean;

  // General Access
  modes: number;
  languages: number;
}

export const tierConfig: Record<Tier, TierConfig> = {
  free: {
    name: "Free",

    dailyQuestions: 20,
    pdfsPerDay: 3,
    unlimitedPdfs: false,
    maxContextChars: 10000,

    chatHistory: false,
    pdfExport: false,
    customMode: false,
    hipaaMode: false,
    search: false,
    folders: false,

    modes: 5,
    languages: 14,
  },

  starter: {
    name: "Starter",

    dailyQuestions: 100,
    pdfsPerDay: undefined,
    unlimitedPdfs: true,
    maxContextChars: 50000,

    chatHistory: true,
    pdfExport: true,
    customMode: false,
    hipaaMode: false,
    search: false,
    folders: false,

    modes: 5,
    languages: 14,
  },

  pro: {
    name: "Pro",

    dailyQuestions: -1, // Unlimited (fair use)
    pdfsPerDay: undefined, // Unlimited
    unlimitedPdfs: true,
    maxContextChars: 100000,

    chatHistory: true,
    pdfExport: true,
    customMode: true,
    hipaaMode: true,
    search: true,
    folders: true,

    modes: 5,
    languages: 14,
  },
};
export type tierConfig = typeof tierConfig[Tier];