import { prisma } from "./prisma";
import { BrandVoice } from "./llm";

export async function getBrandVoice(brandBrainId?: string | null): Promise<BrandVoice> {
  if (!brandBrainId) return null;
  const brain = await prisma.brandBrain.findUnique({ where: { id: brandBrainId } });
  if (!brain) return null;
  return {
    name: brain.name,
    guidelines: brain.guidelines,
    toneKeywords: (brain.toneKeywords as string[]) ?? [],
  };
}
