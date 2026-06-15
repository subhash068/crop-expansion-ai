import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Section, KpiCard, Badge } from "@/components/Kpi";
import { useGroundTruth, useSuitability, cropCategory } from "@/lib/data";
import { Map, Award, Layers } from "lucide-react";

export const Route = createFileRoute("/suitability")({
  head: () => ({ meta: [{ title: "Suitability Mapping — CropVision AI" }] }),
  component: Suitability,
});

function category(score: number) {
  if (score >= 80) return { label: "Highly Suitable", color: "#3aa55a", variant: "success" as const };
  if (score >= 65) return { label: "Suitable", color: "#7dd87f", variant: "success" as const };
  if (score >= 50) return { label: "Moderately Suitable", color: "#f0c560", variant: "warning" as const };
  return { label: "Unsuitable", color: "#e85a4f", variant: "danger" as const };
}

function Suitability() {
  const suit = useSuitability().data ?? [];
  const gt = useGroundTruth().data ?? [];
  const [target, setTarget] = useState<"Millets" | "Pulses" | "Oilseeds">("Millets");
  const [season, setSeason] = useState("Kharif");

  const data = useMemo(() => {
    const gMap = new Map(gt.filter((g) => g.season === season).map((g) => [g.parcel_id, g]));
    return suit.filter((s) => s.season === season && cropCategory(s.recommended_crop) === target)
      .map((s) => {
        const g = gMap.get(s.parcel_id);
        return { ...s, village: g?.village ?? "", mandal: g?.mandal ?? "", area: g?.land_area_acres ?? 0 };
      })
      .sort((a, b) => b.suitability_score - a.suitability_score);
  }, [suit, gt, target, season]);

  const counts = {
    high: data.filter((d) => d.suitability_score >= 80).length,
    suit: data.filter((d) => d.suitability_score >= 65 && d.suitability_score < 80).length,
    mod: data.filter((d) => d.suitability_score >= 50 && d.suitability_score < 65).length,
    un: data.filter((d) => d.suitability_score < 50).length,
  };

  return (
    <AppLayout>
      <PageHeader
        title="Suitability Mapping"
        subtitle="0–100 suitability score combining soil, rainfall, temperature, irrigation & historical yield"
        actions={
          <div className="flex gap-2">
            <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border">
              {(["Millets", "Pulses", "Oilseeds"] as const).map((t) => (
                <button key={t} onClick={() => setTarget(t)}
                  className={`px-3 py-1 text-xs rounded-md ${target === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{t}</button>
              ))}
            </div>
            <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border">
              {["Kharif", "Rabi", "Summer"].map((s) => (
                <button key={s} onClick={() => setSeason(s)}
                  className={`px-3 py-1 text-xs rounded-md ${season === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{s}</button>
              ))}
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Highly Suitable" value={counts.high} icon={Award} />
        <KpiCard label="Suitable" value={counts.suit} icon={Layers} accent="info" />
        <KpiCard label="Moderately Suitable" value={counts.mod} icon={Map} accent="warning" />
        <KpiCard label="Unsuitable" value={counts.un} icon={Map} />
      </div>

      <Section title={`${target} Suitability Heatmap`} subtitle="Each tile = one parcel, color = suitability score" className="mt-6">
        <div className="grid grid-cols-12 sm:grid-cols-20 md:grid-cols-30 gap-1">
          {data.slice(0, 360).map((d) => {
            const c = category(d.suitability_score);
            return (
              <div key={d.parcel_id} title={`${d.parcel_id} · ${d.village} · ${d.suitability_score.toFixed(0)}`}
                className="aspect-square rounded-sm hover:ring-2 ring-foreground/50 transition-all cursor-pointer"
                style={{ background: c.color, opacity: 0.4 + (d.suitability_score / 100) * 0.6 }} />
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs">
          <span className="text-muted-foreground">Score:</span>
          {[["<50", "#e85a4f"], ["50-65", "#f0c560"], ["65-80", "#7dd87f"], [">80", "#3aa55a"]].map(([l, c]) => (
            <span key={l} className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm" style={{ background: c }} /> {l}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Top Suitable Parcels" className="mt-4">
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px]">
              <tr>{["Parcel", "Village", "Mandal", "Soil", "Rainfall", "Temp", "Irrigation", "Yield Hist.", "Score", "Class"].map(h => <th key={h} className="text-left p-2.5">{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.slice(0, 40).map((d) => {
                const c = category(d.suitability_score);
                return (
                  <tr key={d.parcel_id} className="border-t border-border hover:bg-muted/20">
                    <td className="p-2.5 font-mono">{d.parcel_id}</td>
                    <td className="p-2.5">{d.village}</td>
                    <td className="p-2.5">{d.mandal}</td>
                    <td className="p-2.5">{d.soil_score}</td>
                    <td className="p-2.5">{d.rainfall_score}</td>
                    <td className="p-2.5">{d.temperature_score}</td>
                    <td className="p-2.5">{d.irrigation_score}</td>
                    <td className="p-2.5">{d.historical_yield_score}</td>
                    <td className="p-2.5 font-semibold">{d.suitability_score.toFixed(1)}</td>
                    <td className="p-2.5"><Badge variant={c.variant}>{c.label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </AppLayout>
  );
}
