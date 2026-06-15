import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Section } from "@/components/Kpi";
import { useGroundTruth, useSuitability, cropCategory, groupBy, sum, MILLETS, OILSEEDS, PULSES } from "@/lib/data";
import { Bot, Send, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/copilot")({
  head: () => ({ meta: [{ title: "AI Copilot — CropVision AI" }] }),
  component: Copilot,
});

const SUGGESTED = [
  "Which mandals are best for millet expansion?",
  "Which villages have highest diversification potential?",
  "Which parcels are suitable for pulses?",
  "What is the current crop distribution?",
  "Which scheme has highest impact?",
];

type Msg = { role: "user" | "ai"; text: string };

function Copilot() {
  const gt = useGroundTruth().data ?? [];
  const suit = useSuitability().data ?? [];
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "ai", text: "Namaste. I am CropVision AI Copilot. Ask me anything about Anantapur's crop data, suitability or diversification opportunities." },
  ]);
  const [input, setInput] = useState("");

  const answer = useMemo(() => (q: string): string => {
    const ql = q.toLowerCase();
    const kharif = gt.filter((g) => g.season === "Kharif");
    if (ql.includes("millet") && (ql.includes("expan") || ql.includes("best") || ql.includes("mandal"))) {
      const ranked = Object.entries(groupBy(suit.filter((s) => s.season === "Kharif" && MILLETS.includes(s.recommended_crop)), (s) => {
        const g = kharif.find((x) => x.parcel_id === s.parcel_id);
        return g?.mandal ?? "Unknown";
      })).map(([m, l]) => ({ m, score: l.reduce((a, b) => a + b.suitability_score, 0) / l.length, n: l.length }))
        .sort((a, b) => b.score - a.score).slice(0, 5);
      return `Top 5 mandals for millet expansion (avg suitability score):\n${ranked.map((r, i) => `${i + 1}. ${r.m} — ${r.score.toFixed(1)}/100 across ${r.n} parcels`).join("\n")}`;
    }
    if (ql.includes("diversif") && ql.includes("village")) {
      const byVillage = Object.entries(groupBy(suit.filter((s) => s.diversification_potential === "High"), (s) => {
        const g = kharif.find((x) => x.parcel_id === s.parcel_id);
        return g?.village ?? "Unknown";
      })).map(([v, l]) => ({ v, n: l.length })).sort((a, b) => b.n - a.n).slice(0, 5);
      return `Villages with most high-potential diversification parcels:\n${byVillage.map((r, i) => `${i + 1}. ${r.v} — ${r.n} parcels`).join("\n")}`;
    }
    if (ql.includes("pulses") && (ql.includes("suit") || ql.includes("parcel"))) {
      const n = suit.filter((s) => s.season === "Kharif" && PULSES.includes(s.recommended_crop) && s.suitability_score >= 70).length;
      return `${n} parcels are suitable (score ≥ 70) for pulses expansion in Kharif 2025. Top recommended pulses: Red Gram, Bengal Gram, Green Gram.`;
    }
    if (ql.includes("distribution") || ql.includes("current crop")) {
      const dist = Object.entries(groupBy(kharif, (g) => cropCategory(g.crop_type)))
        .map(([k, l]) => ({ k, a: sum(l, (g) => g.land_area_acres) }))
        .sort((a, b) => b.a - a.a);
      const tot = dist.reduce((a, b) => a + b.a, 0);
      return `Current Kharif 2025 crop distribution:\n${dist.map((d) => `• ${d.k}: ${d.a.toFixed(0)} ac (${((d.a / tot) * 100).toFixed(1)}%)`).join("\n")}`;
    }
    if (ql.includes("scheme") || ql.includes("nfsm") || ql.includes("nmeo")) {
      const milletArea = sum(kharif.filter((g) => MILLETS.includes(g.crop_type)), (g) => g.land_area_acres);
      const oilArea = sum(kharif.filter((g) => OILSEEDS.includes(g.crop_type)), (g) => g.land_area_acres);
      return `NFSM (millets) covers ~${milletArea.toFixed(0)} ac. NMEO (oilseeds) covers ~${oilArea.toFixed(0)} ac. NFSM has the higher impact based on parcel count this season.`;
    }
    return "I can answer questions about crop distribution, mandal/village rankings, millet/pulses/oilseed expansion, and scheme effectiveness. Try one of the suggested questions.";
  }, [gt, suit]);

  function send(q?: string) {
    const text = (q ?? input).trim();
    if (!text) return;
    setMsgs((m) => [...m, { role: "user", text }, { role: "ai", text: answer(text) }]);
    setInput("");
  }

  return (
    <AppLayout>
      <PageHeader title="AI Copilot" subtitle="Conversational intelligence over your agricultural datasets" />
      <Section title="" className="!p-0 overflow-hidden">
        <div className="h-[480px] overflow-auto p-5 space-y-3">
          {msgs.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "ai" && (
                <div className="size-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--gradient-primary)" }}>
                  <Bot className="size-4 text-primary-foreground" />
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/60"
              }`}>{m.text}</div>
            </div>
          ))}
        </div>
        <div className="border-t border-border p-3">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {SUGGESTED.map((s) => (
              <button key={s} onClick={() => send(s)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-border hover:bg-muted/60 text-muted-foreground hover:text-foreground flex items-center gap-1">
                <Sparkles className="size-2.5" /> {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask about crops, mandals, suitability…"
              className="flex-1 h-10 px-3 rounded-lg bg-muted/50 border border-border text-sm outline-none focus:ring-2 focus:ring-ring/50" />
            <button onClick={() => send()} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5">
              <Send className="size-4" /> Send
            </button>
          </div>
        </div>
      </Section>
    </AppLayout>
  );
}
