import { createFileRoute } from "@tanstack/react-router";
import { Sprout, TrendingUp, Droplets, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { KpiCard, Section, Badge } from "@/components/Kpi";
import { useGroundTruth, useSuitability, useRotation, useYield, cropCategory } from "@/lib/data";

export const Route = createFileRoute("/diversification")({
  head: () => ({ meta: [{ title: "Diversification Engine — CropVision AI" }] }),
  component: Diversification,
});

function Diversification() {
  const gt = useGroundTruth().data ?? [];
  const suit = useSuitability().data ?? [];
  const rot = useRotation().data ?? [];
  const yields = useYield().data ?? [];
  const [filter, setFilter] = useState<"All" | "Millets" | "Pulses" | "Oilseeds">("All");

  const opportunities = useMemo(() => {
    const yMap = new Map(yields.filter((y) => y.season === "Kharif").map((y) => [y.parcel_id, y]));
    const rMap = new Map(rot.filter((r) => r.season === "Kharif").map((r) => [r.parcel_id, r]));
    const gMap = new Map(gt.filter((g) => g.season === "Kharif").map((g) => [g.parcel_id, g]));
    return suit.filter((s) => s.season === "Kharif").map((s) => {
      const cur = gMap.get(s.parcel_id);
      const r = rMap.get(s.parcel_id);
      const y = yMap.get(s.parcel_id);
      const recCat = cropCategory(s.recommended_crop);
      const curCat = cropCategory(cur?.crop_type ?? "");
      return {
        parcel_id: s.parcel_id,
        village: cur?.village ?? "",
        mandal: cur?.mandal ?? "",
        current: cur?.crop_type ?? "—",
        recommended: s.recommended_crop,
        recCat, curCat,
        score: s.suitability_score,
        potential: s.diversification_potential,
        water_saving: s.water_saving_percent,
        income_gain: Math.round((y?.gross_income_rs ?? 0) * (s.suitability_score / 100 - 0.5)),
      };
    }).filter((o) => o.recCat !== o.curCat);
  }, [gt, suit, rot, yields]);

  const filtered = useMemo(() =>
    filter === "All" ? opportunities : opportunities.filter((o) => o.recCat === filter)
  , [opportunities, filter]);

  const high = filtered.filter((o) => o.potential === "High");
  const med = filtered.filter((o) => o.potential === "Medium");
  const low = filtered.filter((o) => o.potential === "Low");

  return (
    <AppLayout>
      <PageHeader
        title="Diversification Engine"
        subtitle="AI-identified opportunities for millet, pulses & oilseed expansion"
        actions={
          <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border">
            {(["All", "Millets", "Pulses", "Oilseeds"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded-md ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {f}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Opportunities" value={filtered.length} icon={Sprout} />
        <KpiCard label="High Potential" value={high.length} icon={TrendingUp} accent="info" />
        <KpiCard label="Avg Water Saving" value={`${Math.round(filtered.reduce((a, o) => a + o.water_saving, 0) / Math.max(filtered.length, 1))}%`} icon={Droplets} accent="accent" />
        <KpiCard label="Est. Income Gain" value={`₹${(filtered.reduce((a, o) => a + Math.max(o.income_gain, 0), 0) / 1e5).toFixed(1)} L`} accent="warning" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
        {[
          { label: "High Potential", n: high.length, color: "var(--color-success)", desc: "Immediate expansion candidates" },
          { label: "Medium Potential", n: med.length, color: "var(--color-warning)", desc: "Pilot recommended" },
          { label: "Low Potential", n: low.length, color: "var(--color-destructive)", desc: "Requires soil/water intervention" },
        ].map((c) => (
          <div key={c.label} className="glass rounded-xl p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</div>
            <div className="text-3xl font-bold mt-1" style={{ color: c.color }}>{c.n}</div>
            <div className="text-xs text-muted-foreground mt-1">{c.desc}</div>
            <div className="h-1.5 bg-muted rounded-full mt-3 overflow-hidden">
              <div className="h-full" style={{ width: `${(c.n / Math.max(filtered.length, 1)) * 100}%`, background: c.color }} />
            </div>
          </div>
        ))}
      </div>

      <Section title="Recommended Diversification Opportunities" subtitle={`${filtered.length} parcels — top 50 shown`} className="mt-4">
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px]">
              <tr>
                {["Parcel", "Village / Mandal", "Current Crop", "Recommended", "Suitability", "Water Saving", "Est. Income Δ", "Potential"].map((h) => (
                  <th key={h} className="text-left p-2.5 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.sort((a, b) => b.score - a.score).slice(0, 50).map((o) => (
                <tr key={o.parcel_id} className="border-t border-border hover:bg-muted/20">
                  <td className="p-2.5 font-mono">{o.parcel_id}</td>
                  <td className="p-2.5">{o.village} · <span className="text-muted-foreground">{o.mandal}</span></td>
                  <td className="p-2.5">{o.current}</td>
                  <td className="p-2.5 flex items-center gap-1 font-medium text-primary">
                    <ArrowRight className="size-3" /> {o.recommended}
                  </td>
                  <td className="p-2.5">{o.score.toFixed(0)}/100</td>
                  <td className="p-2.5">{o.water_saving}%</td>
                  <td className={`p-2.5 ${o.income_gain >= 0 ? "text-success" : "text-destructive"}`}>
                    {o.income_gain >= 0 ? "+" : ""}₹{Math.abs(o.income_gain).toLocaleString()}
                  </td>
                  <td className="p-2.5">
                    <Badge variant={o.potential === "High" ? "success" : o.potential === "Medium" ? "warning" : "danger"}>{o.potential}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </AppLayout>
  );
}
