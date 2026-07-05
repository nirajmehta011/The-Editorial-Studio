import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const sampleDoc = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "The State of AI Search in 2026" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "AI answer engines now resolve 31% of informational queries before a single click happens. This piece breaks down what that means for content teams, with the numbers that matter and the changes worth making this quarter.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Why citability beats rankings" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "It is very important to understand that rankings were basically a proxy for attention. Engines like Perplexity and ChatGPT Search cite passages, not pages, so the unit of optimization has quietly shifted from the URL to the paragraph.",
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Mistakes were made by teams who ignored structure. In order to get cited, a passage needs a direct claim, a number, and a source within roughly forty words.",
        },
      ],
    },
  ],
};

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@editorialstudio.app" },
    update: {},
    create: { email: "demo@editorialstudio.app", name: "Demo Writer" },
  });

  const acme = await prisma.workspace.upsert({
    where: { slug: "acme-content" },
    update: {},
    create: { name: "Acme Content Studio", slug: "acme-content", ownerId: user.id },
  });

  const nimbus = await prisma.workspace.upsert({
    where: { slug: "nimbus-agency" },
    update: {},
    create: { name: "Nimbus Agency", slug: "nimbus-agency", ownerId: user.id },
  });

  const existingBrains = await prisma.brandBrain.count();
  if (existingBrains === 0) {
    await prisma.brandBrain.createMany({
      data: [
        {
          workspaceId: acme.id,
          name: "Acme — Technical Authority",
          description: "Developer-facing, evidence-first voice.",
          guidelines:
            "# Acme Voice\n- Write for senior engineers; never oversell.\n- Every claim gets a number or a source.\n- Short declarative sentences. No exclamation marks.\n- Prefer concrete verbs: ship, measure, cut, break.",
          toneKeywords: ["precise", "evidence-first", "dry wit"],
        },
        {
          workspaceId: acme.id,
          name: "Acme — Friendly Explainer",
          description: "Beginner-facing tutorials and onboarding content.",
          guidelines:
            "# Explainer Voice\n- Assume zero prior knowledge; define every acronym.\n- Use second person and everyday analogies.\n- One idea per paragraph, max three sentences each.",
          toneKeywords: ["warm", "plain-language", "encouraging"],
        },
        {
          workspaceId: nimbus.id,
          name: "Nimbus — Bold B2B",
          description: "Punchy thought leadership for SaaS clients.",
          guidelines:
            "# Nimbus Voice\n- Open with a contrarian claim.\n- Sentences under 18 words. Fragments allowed.\n- Always end sections with an actionable takeaway.",
          toneKeywords: ["contrarian", "punchy", "actionable"],
        },
      ],
    });
  }

  const brain = await prisma.brandBrain.findFirst({ where: { workspaceId: acme.id } });
  const existingDocs = await prisma.document.count();
  if (existingDocs === 0) {
    await prisma.document.create({
      data: {
        workspaceId: acme.id,
        brandBrainId: brain?.id,
        title: "The State of AI Search in 2026",
        content: sampleDoc,
        status: "DRAFT",
        meta: { targetKeyword: "ai search optimization" },
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
