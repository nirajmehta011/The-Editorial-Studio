"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, BrainCircuit, Settings, Wifi, WifiOff } from "lucide-react";
import { useStudioStore } from "@/lib/store";
import { SettingsPanel } from "@/components/SettingsPanel";

export function Navbar() {
  const pathname = usePathname();
  const {
    workspaces,
    activeWorkspaceId,
    activeBrainId,
    setWorkspaces,
    setActiveWorkspace,
    setActiveBrain,
    searchApiKey,
    searchProvider,
    llmApiKey,
    llmProvider,
    llmModel,
    availableModels,
  } = useStudioStore();

  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    fetch("/api/workspaces")
      .then((r) => r.json())
      .then((data) => setWorkspaces(data.workspaces ?? []))
      .catch((err) => console.error("Failed to load workspaces:", err));
  }, [setWorkspaces]);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const isSearchLive = Boolean(searchApiKey && searchProvider);
  const isLlmLive = Boolean(llmApiKey && llmProvider);
  const selectedModel = availableModels.find((m) => m.id === llmModel);

  const linkClass = (href: string) =>
    `px-3 py-1.5 rounded text-sm transition-colors ${
      pathname?.startsWith(href) ? "bg-ink-3 text-chalk" : "text-fog hover:text-chalk"
    }`;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-ink-line bg-ink/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-5">
          <Link href="/desk" className="flex items-baseline gap-0.5">
            <span className="font-[family-name:var(--font-prose)] text-lg font-semibold tracking-tight">
              The Editorial Studio
            </span>
            <span className="text-proof text-2xl leading-none">.</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link href="/desk" className={linkClass("/desk")}>Desk</Link>
            <Link href="/discovery" className={linkClass("/discovery")}>Discovery &amp; Trends</Link>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* Live search status pill */}
            <div
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                isSearchLive
                  ? "border-sage/30 bg-sage/10 text-sage"
                  : "border-ink-line bg-ink-2 text-fog"
              }`}
              title={isSearchLive ? `Live search: ${searchProvider}` : "Mock search data"}
            >
              {isSearchLive ? <Wifi size={11} /> : <WifiOff size={11} />}
              {isSearchLive ? searchProvider : "Mock"}
            </div>

            {/* LLM provider pill */}
            {isLlmLive && selectedModel && (
              <div
                className="flex items-center gap-1.5 rounded-full border border-proof/30 bg-proof/10 px-2.5 py-1 text-[11px] text-proof"
                title={`AI: ${llmProvider} / ${selectedModel.name}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-proof" />
                {selectedModel.name.length > 16 ? selectedModel.name.slice(0, 15) + "…" : selectedModel.name}
              </div>
            )}

            <label className="flex items-center gap-2 rounded border border-ink-line bg-ink-2 px-2.5 py-1.5">
              <Building2 size={13} className="text-fog" />
              <select
                aria-label="Workspace"
                value={activeWorkspaceId ?? ""}
                onChange={(e) => setActiveWorkspace(e.target.value)}
                className="bg-transparent text-sm text-chalk outline-none"
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id} className="bg-ink-2">{w.name}</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 rounded border border-ink-line bg-ink-2 px-2.5 py-1.5">
              <BrainCircuit size={13} className="text-proof" />
              <select
                aria-label="Brand brain"
                value={activeBrainId ?? ""}
                onChange={(e) => setActiveBrain(e.target.value || null)}
                className="bg-transparent text-sm text-chalk outline-none max-w-[190px]"
              >
                {(activeWorkspace?.brandBrains ?? []).map((b) => (
                  <option key={b.id} value={b.id} className="bg-ink-2">{b.name}</option>
                ))}
                <option value="" className="bg-ink-2">No brand brain</option>
              </select>
            </label>

            {/* Settings button */}
            <button
              id="nav-settings-btn"
              onClick={() => setSettingsOpen(true)}
              aria-label="API settings"
              className={`rounded p-1.5 transition-colors hover:bg-ink-3 ${
                settingsOpen ? "bg-ink-3 text-chalk" : "text-fog"
              }`}
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </header>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
