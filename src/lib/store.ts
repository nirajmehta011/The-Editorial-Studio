"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type BrainSummary = { id: string; name: string; description?: string | null };
export type WorkspaceSummary = { id: string; name: string; slug: string; brandBrains: BrainSummary[] };

export type SearchProvider = "tavily" | "serper" | "brave";
export type LlmProvider = "anthropic" | "openai" | "google" | "groq" | "openrouter";

export type ModelInfo = {
  id: string;
  name: string;
  contextWindow?: number;
  description?: string;
};

type StudioState = {
  workspaces: WorkspaceSummary[];
  activeWorkspaceId: string | null;
  activeBrainId: string | null;
  setWorkspaces: (ws: WorkspaceSummary[]) => void;
  setActiveWorkspace: (id: string) => void;
  setActiveBrain: (id: string | null) => void;

  // Search provider
  searchProvider: SearchProvider | null;
  searchApiKey: string;
  setSearchProvider: (p: SearchProvider | null) => void;
  setSearchApiKey: (k: string) => void;

  // LLM provider
  llmProvider: LlmProvider | null;
  llmApiKey: string;
  llmModel: string;
  availableModels: ModelInfo[];
  setLlmProvider: (p: LlmProvider | null) => void;
  setLlmApiKey: (k: string) => void;
  setLlmModel: (m: string) => void;
  setAvailableModels: (models: ModelInfo[]) => void;
};

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      activeWorkspaceId: null,
      activeBrainId: null,
      setWorkspaces: (workspaces) => {
        const { activeWorkspaceId } = get();
        const stillValid = workspaces.some((w) => w.id === activeWorkspaceId);
        const nextWorkspace = stillValid ? activeWorkspaceId : workspaces[0]?.id ?? null;
        const ws = workspaces.find((w) => w.id === nextWorkspace);
        const brainValid = ws?.brandBrains.some((b) => b.id === get().activeBrainId);
        set({
          workspaces,
          activeWorkspaceId: nextWorkspace,
          activeBrainId: brainValid ? get().activeBrainId : ws?.brandBrains[0]?.id ?? null,
        });
      },
      setActiveWorkspace: (id) => {
        const ws = get().workspaces.find((w) => w.id === id);
        set({ activeWorkspaceId: id, activeBrainId: ws?.brandBrains[0]?.id ?? null });
      },
      setActiveBrain: (id) => set({ activeBrainId: id }),

      // Search
      searchProvider: null,
      searchApiKey: "",
      setSearchProvider: (p) => set({ searchProvider: p }),
      setSearchApiKey: (k) => set({ searchApiKey: k }),

      // LLM
      llmProvider: null,
      llmApiKey: "",
      llmModel: "",
      availableModels: [],
      setLlmProvider: (p) => set({ llmProvider: p, llmModel: "", availableModels: [] }),
      setLlmApiKey: (k) => set({ llmApiKey: k }),
      setLlmModel: (m) => set({ llmModel: m }),
      setAvailableModels: (models) => set({ availableModels: models }),
    }),
    { name: "editorial-studio" }
  )
);
