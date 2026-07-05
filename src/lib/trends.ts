/**
 * Trend intelligence dataset. Static + deterministic so the Discovery
 * dashboard renders identically across environments; swap `getTrends` for a
 * live provider (Glimpse, Exploding Topics API) without touching the UI.
 */

export type Competition = "LOW" | "MEDIUM" | "HIGH";

export type Trend = {
  id: string;
  topic: string;
  niche: "Tech" | "Finance" | "Health" | "Marketing" | "Lifestyle" | "Fitness" | "Sports";
  interestVolume: number; // monthly searches
  growthPct: number; // 90-day growth %
  competition: Competition;
  summary: string;
};

const TRENDS: Trend[] = [
  { id: "agentic-browsers", topic: "Agentic browsers", niche: "Tech", interestVolume: 74000, growthPct: 412, competition: "LOW", summary: "Browsers that complete multi-step tasks autonomously are crossing into mainstream coverage." },
  { id: "local-llm-appliances", topic: "Local LLM appliances", niche: "Tech", interestVolume: 28000, growthPct: 318, competition: "LOW", summary: "Plug-in home inference boxes are spiking after two consumer launches." },
  { id: "post-quantum-migration", topic: "Post-quantum migration", niche: "Tech", interestVolume: 41000, growthPct: 156, competition: "MEDIUM", summary: "Compliance deadlines are pushing enterprise crypto migration guides." },
  { id: "ai-code-review", topic: "AI code review workflows", niche: "Tech", interestVolume: 96000, growthPct: 89, competition: "HIGH", summary: "Crowded but massive: every dev tools vendor is publishing here." },
  { id: "tokenized-treasuries", topic: "Tokenized treasuries", niche: "Finance", interestVolume: 52000, growthPct: 264, competition: "MEDIUM", summary: "On-chain T-bill products are pulling in yield-hunting retail." },
  { id: "cash-flow-underwriting", topic: "Cash-flow underwriting", niche: "Finance", interestVolume: 18000, growthPct: 231, competition: "LOW", summary: "Lenders replacing credit scores with live cash-flow data." },
  { id: "fraud-agent-defense", topic: "AI fraud agent defense", niche: "Finance", interestVolume: 33000, growthPct: 387, competition: "LOW", summary: "Banks are scrambling for content on defending against agentic fraud." },
  { id: "fire-variants", topic: "Coast FIRE calculators", niche: "Finance", interestVolume: 61000, growthPct: 74, competition: "HIGH", summary: "Evergreen personal-finance volume, heavily contested SERP." },
  { id: "glp1-maintenance", topic: "GLP-1 maintenance plans", niche: "Health", interestVolume: 110000, growthPct: 198, competition: "MEDIUM", summary: "The conversation moved from starting GLP-1s to sustaining results." },
  { id: "sleep-debt-tracking", topic: "Sleep debt tracking", niche: "Health", interestVolume: 47000, growthPct: 243, competition: "LOW", summary: "Wearable makers popularized a metric the content web hasn't covered." },
  { id: "protein-timing", topic: "Protein timing myths", niche: "Health", interestVolume: 88000, growthPct: 51, competition: "HIGH", summary: "High volume, but registered dietitians dominate the results." },
  { id: "menopause-tech", topic: "Menopause health tech", niche: "Health", interestVolume: 26000, growthPct: 289, competition: "LOW", summary: "Femtech investment wave with a thin publisher landscape." },
  { id: "zero-click-content", topic: "Zero-click content strategy", niche: "Marketing", interestVolume: 39000, growthPct: 336, competition: "LOW", summary: "Marketers want playbooks for value delivered inside the feed/SERP." },
  { id: "geo-optimization", topic: "Generative engine optimization", niche: "Marketing", interestVolume: 67000, growthPct: 451, competition: "MEDIUM", summary: "GEO is this cycle's SEO — explosive interest, forming canon." },
  { id: "creator-licensing", topic: "Creator content licensing", niche: "Marketing", interestVolume: 21000, growthPct: 174, competition: "LOW", summary: "Brands licensing creator back-catalogs instead of commissioning." },
  { id: "cmo-ai-budgets", topic: "CMO AI budget planning", niche: "Marketing", interestVolume: 15000, growthPct: 122, competition: "MEDIUM", summary: "Budget-season searches from marketing leadership." },
  { id: "slow-travel-rail", topic: "Slow travel by rail", niche: "Lifestyle", interestVolume: 58000, growthPct: 141, competition: "MEDIUM", summary: "Night-train revival meets climate-conscious travel planning." },
  { id: "third-places", topic: "Third places revival", niche: "Lifestyle", interestVolume: 44000, growthPct: 267, competition: "LOW", summary: "Post-remote-work search wave about rebuilding social spaces." },
  { id: "hyrox-training", topic: "Hyrox training plans", niche: "Fitness", interestVolume: 85000, growthPct: 290, competition: "LOW", summary: "Indoor fitness racing is generating high search volume for structured prep guides." },
  { id: "rucking-efficiency", topic: "Rucking efficiency standards", niche: "Fitness", interestVolume: 44000, growthPct: 125, competition: "MEDIUM", summary: "Weighted walking is trending as low-impact steady-state cardiovascular exercise." },
  { id: "pickleball-paddle-tech", topic: "Thermoformed pickleball paddles", niche: "Sports", interestVolume: 92000, growthPct: 310, competition: "LOW", summary: "High-end carbon fiber paddles are dominating player gear reviews." },
  { id: "formula1-aerodynamics", topic: "F1 ground effect mechanics", niche: "Sports", interestVolume: 55000, growthPct: 78, competition: "HIGH", summary: "Technical explainers explaining ground effect are trending heavily among younger F1 fans." },
];

export const NICHES = ["All", "Tech", "Finance", "Health", "Marketing", "Lifestyle", "Fitness", "Sports"] as const;

export function getTrends(niche?: string): Trend[] {
  const list = !niche || niche === "All" ? TRENDS : TRENDS.filter((t) => t.niche === niche);
  return [...list].sort((a, b) => b.growthPct - a.growthPct);
}

export function getTrend(id: string): Trend | undefined {
  return TRENDS.find((t) => t.id === id);
}

/** Gap Finder: explosive growth with thin competition. */
export function isGap(t: Trend): boolean {
  return t.growthPct >= 200 && t.competition === "LOW";
}
