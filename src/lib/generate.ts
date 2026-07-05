import {
  BrandVoice,
  LlmUnavailableError,
  LlmContext,
  brandSystemPrompt,
  completeStructured,
} from "./llm";
import { splitSentences } from "./tiptap-text";

/**
 * Feature-level generators. Each tries the live LLM first and falls back to a
 * deterministic offline mock, so every workflow is demoable without a key.
 * Every return value carries `live` so the UI can label mock output.
 */

// ---------------------------------------------------------------------------
// Content angles (Discovery → "Write About This")
// ---------------------------------------------------------------------------

export type ContentAngle = { name: string; headline: string; outline: string[] };

export async function generateAngles(
  topic: string,
  brand: BrandVoice,
  llmCtx?: LlmContext,
  customFocus?: string
): Promise<{ angles: ContentAngle[]; live: boolean; error?: string }> {
  try {
    let prompt = `Generate exactly three structural content angles for an article about "${topic}": (1) The Beginner's Guide, (2) The Contrarian Take, (3) The Deep Analytical Breakdown. For each give a working headline and a 4-item outline of H2 sections.`;
    if (customFocus) {
      prompt += ` Please prioritize and tailor all three angles to focus on: ${customFocus}.`;
    }
    const data = await completeStructured<{ angles: ContentAngle[] }>({ llmCtx,
      system: brandSystemPrompt(brand),
      prompt,
      schema: {
        type: "object",
        properties: {
          angles: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                headline: { type: "string" },
                outline: { type: "array", items: { type: "string" } },
              },
              required: ["name", "headline", "outline"],
              additionalProperties: false,
            },
          },
        },
        required: ["angles"],
        additionalProperties: false,
      },
    });
    return { angles: data.angles.slice(0, 3), live: true };
  } catch (err) {
    if (err instanceof LlmUnavailableError) {
      return { angles: mockAngles(topic, customFocus), live: false };
    }
    console.error("generateAngles live call failed:", err);
    return {
      angles: mockAngles(topic, customFocus),
      live: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function mockAngles(topic: string, customFocus?: string): ContentAngle[] {
  const suffix = customFocus ? ` (Focus: ${customFocus})` : "";
  return [
    {
      name: "The Beginner's Guide",
      headline: `${topic}: The No-Jargon Starter Guide${suffix}`,
      outline: [
        `What ${topic} actually is (and isn't)`,
        "The 20% of concepts that cover 80% of cases",
        "Your first week, step by step",
        "Mistakes every beginner makes once",
      ],
    },
    {
      name: "The Contrarian Take",
      headline: `Everyone Is Wrong About ${topic}${suffix}`,
      outline: [
        "The consensus view — and where it breaks",
        "What the data says when you look closer",
        "Who actually benefits from the hype",
        "A saner playbook for the rest of us",
      ],
    },
    {
      name: "The Deep Analytical Breakdown",
      headline: `${topic} by the Numbers: A Complete Analysis${suffix}`,
      outline: [
        "Market size, growth curve, and who's spending",
        "Benchmark data across 6 dimensions",
        "Cost model: build vs buy vs wait",
        "12-month outlook and leading indicators",
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Research summarizer
// ---------------------------------------------------------------------------

export async function summarizeResearch(
  title: string,
  body: string,
  brand: BrandVoice,
  llmCtx?: LlmContext
): Promise<{ bullets: string[]; live: boolean }> {
  try {
    const data = await completeStructured<{ bullets: string[] }>({ llmCtx,
      system: brandSystemPrompt(brand),
      prompt: `Summarize this source into exactly 5 bullet points focused on data, metrics, and key assertions. Keep each bullet under 25 words.\n\nTITLE: ${title}\n\nBODY:\n${body.slice(0, 12000)}`,
      schema: {
        type: "object",
        properties: { bullets: { type: "array", items: { type: "string" } } },
        required: ["bullets"],
        additionalProperties: false,
      },
    });
    return { bullets: data.bullets.slice(0, 5), live: true };
  } catch (err) {
    if (!(err instanceof LlmUnavailableError)) console.error("summarizeResearch live call failed:", err);
    return { bullets: mockSummary(body), live: false };
  }
}

export function mockSummary(body: string): string[] {
  const sentences = splitSentences(body.replace(/\n+/g, " "));
  // Prefer sentences carrying numbers — that's what the summarizer promises.
  const withNumbers = sentences.filter((s) => /\d/.test(s));
  const pool = [...withNumbers, ...sentences.filter((s) => !/\d/.test(s))];
  return pool.slice(0, 5).map((s) => (s.length > 160 ? s.slice(0, 157) + "…" : s));
}

// ---------------------------------------------------------------------------
// Asset cascading (one-to-many distribution)
// ---------------------------------------------------------------------------

export type DistributionPack = {
  newsletter: string;
  linkedin: string;
  thread: string[];
  videoScript: string;
  medium: string;
  blogspot: string;
};

export async function generateCascade(
  title: string,
  text: string,
  brand: BrandVoice,
  llmCtx?: LlmContext
): Promise<{ pack: DistributionPack; live: boolean }> {
  if (!text.trim()) {
    return { pack: mockCascade(title, text), live: false };
  }
  try {
    const system = brandSystemPrompt(brand);
    const source = `ARTICLE TITLE: ${title}\n\nARTICLE:\n${text.slice(0, 14000)}`;
    // Parallel prompt chains — one focused call per asset.
    const [newsletter, linkedin, thread, video, medium, blogspot] = await Promise.all([
      completeStructured<{ content: string }>({
        llmCtx, system,
        prompt: `${source}\n\nWrite a professional email newsletter teaser for this article: subject line, 2 short paragraphs, and a one-line CTA. Return as a single formatted string.`,
        schema: stringSchema(),
      }),
      completeStructured<{ content: string }>({
        llmCtx, system,
        prompt: `${source}\n\nWrite a long-form LinkedIn post (150-250 words) derived from this article. Hook in line one, whitespace-friendly formatting, no hashtags spam (max 3).`,
        schema: stringSchema(),
      }),
      completeStructured<{ posts: string[] }>({
        llmCtx, system,
        prompt: `${source}\n\nWrite a 5-part X (Twitter) thread from this article. Each post under 260 characters. Post 1 is the hook, post 5 the CTA.`,
        schema: {
          type: "object",
          properties: { posts: { type: "array", items: { type: "string" } } },
          required: ["posts"],
          additionalProperties: false,
        },
      }),
      completeStructured<{ content: string }>({
        llmCtx, system,
        prompt: `${source}\n\nWrite a short-form video hook + script (TikTok/Reels, ~45 seconds). Format: HOOK line, then timestamped beats [0-5s], [5-15s], [15-35s], [35-45s].`,
        schema: stringSchema(),
      }),
      completeStructured<{ content: string }>({
        llmCtx, system,
        prompt: `${source}\n\nWrite a Medium-optimized article version of this piece (about 250-400 words) with structured subheadings, engaging narrative flow, and a reading-friendly format.`,
        schema: stringSchema(),
      }),
      completeStructured<{ content: string }>({
        llmCtx, system,
        prompt: `${source}\n\nWrite a Blogger/Blogspot-ready HTML-formatted version of this article. Wrap paragraphs in <p>, headings in <h2>/<h3>, and bold key terms in <strong> so it is ready for the HTML view in Blogspot.`,
        schema: stringSchema(),
      }),
    ]);
    return {
      pack: {
        newsletter: newsletter.content,
        linkedin: linkedin.content,
        thread: thread.posts.slice(0, 5),
        videoScript: video.content,
        medium: medium.content,
        blogspot: blogspot.content,
      },
      live: true,
    };
  } catch (err) {
    if (!(err instanceof LlmUnavailableError)) console.error("generateCascade live call failed:", err);
    return { pack: mockCascade(title, text), live: false };
  }
}

function stringSchema() {
  return {
    type: "object",
    properties: { content: { type: "string" } },
    required: ["content"],
    additionalProperties: false,
  };
}

export function mockCascade(title: string, text: string): DistributionPack {
  const sentences = splitSentences(text.replace(/\n+/g, " "));
  const lead = sentences[0] ?? `We just published: ${title}.`;
  const stat = sentences.find((s) => /\d/.test(s)) ?? lead;
  const point = sentences[2] ?? sentences[1] ?? lead;

  return {
    newsletter: [
      `Subject: ${title}`,
      "",
      lead,
      "",
      `One number worth your attention: ${stat}`,
      "",
      `→ Read the full piece for the complete breakdown.`,
    ].join("\n"),
    linkedin: [
      `${lead}`,
      "",
      `Here's what most teams miss:`,
      "",
      `${point}`,
      "",
      `${stat}`,
      "",
      `Full analysis in the article — link in comments.`,
    ].join("\n"),
    thread: [
      `${lead} A thread 🧵`,
      `1/ The context: ${point}`,
      `2/ The number that matters: ${stat}`,
      `3/ What to do with it: start small, measure weekly, kill what's flat after two cycles.`,
      `4/ Full breakdown here → [link]. Follow for more like this.`,
    ],
    videoScript: [
      `HOOK: ${lead}`,
      `[0-5s] Cold open on the hook — text on screen.`,
      `[5-15s] The setup: ${point}`,
      `[15-35s] The proof: ${stat}`,
      `[35-45s] CTA: "Full article linked in bio — save this for your next planning cycle."`,
    ].join("\n"),
    medium: [
      `# ${title}`,
      "",
      lead,
      "",
      `## Key Takeaways`,
      `* ${point}`,
      `* ${stat}`,
      "",
      `What separating the top performers is a commitment to measurement. Start small, measure weekly, and adapt fast.`,
    ].join("\n"),
    blogspot: [
      `<h2>${title}</h2>`,
      `<p>${lead}</p>`,
      `<h3>Key Takeaways</h3>`,
      `<ul>`,
      `  <li><strong>${point}</strong></li>`,
      `  <li><strong>${stat}</strong></li>`,
      `</ul>`,
    ].join("\n"),
  };
}

// ---------------------------------------------------------------------------
// Cadence rephrase (humanize a robotic block)
// ---------------------------------------------------------------------------

export async function rephraseBlock(
  text: string,
  brand: BrandVoice,
  llmCtx?: LlmContext
): Promise<{ text: string; live: boolean }> {
  try {
    const data = await completeStructured<{ content: string }>({ llmCtx,
      system: brandSystemPrompt(brand),
      prompt: `Rewrite this paragraph to break robotic pacing: vary sentence lengths (mix a short punch with a longer clause), swap stock phrasing for concrete language, keep every factual claim intact.\n\n${text}`,
      schema: stringSchema(),
    });
    return { text: data.content, live: true };
  } catch (err) {
    if (!(err instanceof LlmUnavailableError)) console.error("rephraseBlock live call failed:", err);
    return { text: mockRephrase(text), live: false };
  }
}

export function mockRephrase(text: string): string {
  const sentences = splitSentences(text);
  if (sentences.length < 2) return text;
  // Mechanical burstiness injection: shorten one sentence, merge two others.
  const out: string[] = [];
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    if (i === 0) {
      const words = s.split(" ");
      out.push(words.length > 8 ? words.slice(0, 6).join(" ").replace(/[,;:]$/, "") + "." : s);
      if (words.length > 8) out.push(words.slice(6).join(" ").replace(/^[a-z]/, (c) => c.toUpperCase()));
    } else if (i === 1 && sentences[i + 1]) {
      out.push(s.replace(/[.!?]$/, "") + " — " + sentences[i + 1].replace(/^[A-Z]/, (c) => c.toLowerCase()));
      i++;
    } else {
      out.push(s);
    }
  }
  return out.join(" ");
}
