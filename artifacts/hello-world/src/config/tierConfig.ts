export type Tier = "free" | "starter" | "pro";

export interface TierConfig {
  name: string;
  authRequired: boolean;

  // Usage Limits
  dailyQuestions: number;           // -1 = unlimited
  pdfsPerDay: number;               // -1 = unlimited
  maxContextChars: number;
  maxExportsPerDay: number;         // -1 = unlimited

  // Chat History
  chatHistory: boolean;
  chatHistoryLimit: number;         // -1 = unlimited, 0 = none
  chatHistoryRetentionDays: number; // -1 = forever, 0 = none
  chatSearch: boolean;
  namedChats: boolean;

  // Features
  pdfExport: boolean;
  customMode: boolean;              // TODO: Pro phase 2
  hipaaMode: boolean;               // TODO: Pro phase 2
  folders: boolean;                 // TODO: Pro phase 2
  workspaces: boolean;              // TODO: Pro phase 2
  largeDocumentSupport: boolean;
  priorityPerformance: boolean;

  // Mode Access
  modes: number;
  unlockedModeIds: string[];

  // Storage
  storageType: "localStorage" | "supabase";

  // Pricing
  monthlyPriceUSD: number;
  yearlyPriceUSD: number;
  monthlyPriceINR: number;
  yearlyPriceINR: number;

  // Abuse Prevention
  ipTracking: boolean;
}

export const MODES = {
  ANALYST: "analyst",
  TEACHER: "teacher",
  LAWYER: "lawyer",
  TLDR: "summarizer",
  MEDICAL: "doctor",
  KEY_INSIGHTS: "insights",
  STUDY_NOTES: "studynotes",
  EXAM_GENERATOR: "examgen",
  DEFAULT: "default"
} as const;

export const ALL_MODES = Object.values(MODES);

export const FREE_MODES = [
  MODES.ANALYST,
  MODES.TEACHER,
  MODES.LAWYER,
  MODES.TLDR,
  MODES.MEDICAL,
  MODES.KEY_INSIGHTS,
];

/*
 * Daily Questions Cap Reasoning:
 * Free (30)     — cost protection + enough to experience value
 * Starter (100) — fair use, covers most professional workflows
 * Pro (-1)      — unlimited fair use, trust-based
 */

export const tierConfig: Record<Tier, TierConfig> = {
  free: {
    name: "Free",  // Alternative: "Try" — keeping "Free" for clarity
    authRequired: true,

    dailyQuestions: 30,
    pdfsPerDay: 3,
    maxContextChars: 25000,
    maxExportsPerDay: 2,

    chatHistory: false,
    chatHistoryLimit: 0,
    chatHistoryRetentionDays: 0,
    chatSearch: false,
    namedChats: false,

    pdfExport: true,
    customMode: false,            // TODO: Pro phase 2
    hipaaMode: false,             // TODO: Pro phase 2
    folders: false,               // TODO: Pro phase 2
    workspaces: false,            // TODO: Pro phase 2
    largeDocumentSupport: false,
    priorityPerformance: false,

    modes: 6,
    unlockedModeIds: FREE_MODES,

    storageType: "supabase",

    monthlyPriceUSD: 0,
    yearlyPriceUSD: 0,
    monthlyPriceINR: 0,
    yearlyPriceINR: 0,

    ipTracking: true,
  },

  starter: {
    name: "Starter",
    authRequired: true,

    dailyQuestions: 100,
    pdfsPerDay: 25,
    maxContextChars: 50000,
    maxExportsPerDay: 10,

    chatHistory: true,
    chatHistoryLimit: 10,
    chatHistoryRetentionDays: 14,
    chatSearch: false,
    namedChats: false,

    pdfExport: true,
    customMode: false,            // TODO: Pro phase 2
    hipaaMode: false,             // TODO: Pro phase 2
    folders: false,               // TODO: Pro phase 2
    workspaces: false,            // TODO: Pro phase 2
    largeDocumentSupport: false,
    priorityPerformance: false,

    modes: 9,
    unlockedModeIds: ALL_MODES,

    storageType: "supabase",

    monthlyPriceUSD: 6,
    yearlyPriceUSD: 60,           // Save $12 — 2 months free
    monthlyPriceINR: 199,
    yearlyPriceINR: 1990,         // Save ₹398 — 2 months free

    ipTracking: false,
  },

  pro: {
    name: "Pro",
    authRequired: true,

    dailyQuestions: -1,           // unlimited fair use
    pdfsPerDay: -1,               // unlimited
    maxContextChars: 4000000,
    maxExportsPerDay: -1,         // unlimited

    chatHistory: true,
    chatHistoryLimit: -1,         // unlimited
    chatHistoryRetentionDays: -1, // forever
    chatSearch: true,
    namedChats: true,

    pdfExport: true,
    customMode: false,            // TODO: Pro phase 2
    hipaaMode: false,             // TODO: Pro phase 2
    folders: false,               // TODO: Pro phase 2
    workspaces: false,            // TODO: Pro phase 2
    largeDocumentSupport: true,
    priorityPerformance: true,

    modes: 8,
    unlockedModeIds: ALL_MODES,

    storageType: "supabase",

    monthlyPriceUSD: 12,
    yearlyPriceUSD: 120,          // Save $24 — 2 months free
    monthlyPriceINR: 499,
    yearlyPriceINR: 4990,         // Save ₹998 — 2 months free

    ipTracking: false,
  },
};

export type TierConfigType = typeof tierConfig[Tier];

// Helper functions
export const getTierConfig = (tier: Tier): TierConfig => tierConfig[tier];

export const isFeatureUnlocked = (tier: Tier, mode: string): boolean =>
  tierConfig[tier].unlockedModeIds.includes(mode);

export const isUnlimited = (value: number): boolean => value === -1;

export const getUpgradeMessage = (tier: Tier): string => {
  if (tier === "free")
    return "Upgrade to Starter to unlock all modes, unlimited PDFs and chat history.";
  if (tier === "starter")
    return "Upgrade to Pro for unlimited usage, large document support and full chat history.";
  return "";
};

/*
 * Pricing Display Notes:
 * - Default pricing toggle to YEARLY (anchors lower number perception)
 * - Show savings as "2 months free" not "X% off"
 *
 * Starter: $6/mo | $60/yr (Save $12)  |  ₹199/mo | ₹1,990/yr (Save ₹398)
 * Pro:    $12/mo | $120/yr (Save $24) |  ₹499/mo | ₹4,990/yr (Save ₹998)
 */