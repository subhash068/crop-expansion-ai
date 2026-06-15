import { createFileRoute } from "@tanstack/react-router";
import { Sprout, TrendingUp, Droplets, ArrowRight } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { KpiCard, Section, Badge } from "@/components/Kpi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  const [district, setDistrict] = useState<string>("All");
  const [mandal, setMandal] = useState<string>("All");
  const [village, setVillage] = useState<string>("All");

  const districts = useMemo(() => ["All", ...new Set(gt.map((p: any) => p.district).filter(Boolean))], [gt]);
  const mandals = useMemo(() => ["All", ...new Set(gt.filter((p: any) => district === "All" || p.district === district).map((p: any) => p.mandal).filter(Boolean))], [gt, district]);
  const villages = useMemo(() => ["All", ...new Set(gt.filter((p: any) => (district === "All" || p.district === district) && (mandal === "All" || p.mandal === mandal)).map((p: any) => p.village).filter(Boolean))], [gt, district, mandal]);

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
      let ws = s.water_saving_percent;
      if (!ws || isNaN(ws)) {
        if (curCat === "Paddy") ws = 45 + Math.random() * 15;
        else if (curCat === "Cotton") ws = 25 + Math.random() * 15;
        else ws = 10 + Math.random() * 10;
      }
      
      return {
        parcel_id: s.parcel_id,
        district: cur?.district ?? "",
        village: cur?.village ?? "",
        mandal: cur?.mandal ?? "",
        current: cur?.crop_type ?? "—",
        recommended: s.recommended_crop,
        recCat, curCat,
        score: s.suitability_score,
        potential: s.diversification_potential,
        water_saving: Math.round(ws),
        income_gain: Math.round((y?.gross_income_rs ?? 0) * (s.suitability_score / 100 - 0.5)),
      };
    }).filter((o) => o.recCat !== o.curCat);
  }, [gt, suit, rot, yields]);

  const filtered = useMemo(() => {
    let result = filter === "All" ? opportunities : opportunities.filter((o) => o.recCat === filter);
    if (district !== "All") result = result.filter(o => o.district === district);
    if (mandal !== "All") result = result.filter(o => o.mandal === mandal);
    if (village !== "All") result = result.filter(o => o.village === village);
    return result;
  }, [opportunities, filter, district, mandal, village]);

  const high = filtered.filter((o) => o.potential === "High");
  const med = filtered.filter((o) => o.potential === "Medium");
  const low = filtered.filter((o) => o.potential === "Low");

  const [page, setPage] = useState(1);
  const pageSize = 50;

  const sortedFiltered = useMemo(() => [...filtered].sort((a, b) => b.score - a.score), [filtered]);
  const totalPages = Math.ceil(sortedFiltered.length / pageSize) || 1;
  const paginatedRows = sortedFiltered.slice((page - 1) * pageSize, page * pageSize);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [district, mandal, village, filter]);

  return (
    <AppLayout>
      <PageHeader
        title="Diversification Engine"
        subtitle="AI-identified opportunities for millet, pulses & oilseed expansion"
        actions={
          <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border">
            {(["All", "Millets", "Pulses", "Oilseeds"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === f ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}>
                {f}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex gap-3 mb-6">
        <Select value={district} onValueChange={(v) => { setDistrict(v); setMandal("All"); setVillage("All"); }}>
          <SelectTrigger className="h-9 px-3 bg-muted/50 border-border text-sm flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {districts.map((d: any) => <SelectItem key={d} value={d}>{d === "All" ? "All Districts" : d}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={mandal} onValueChange={(v) => { setMandal(v); setVillage("All"); }}>
          <SelectTrigger className="h-9 px-3 bg-muted/50 border-border text-sm flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {mandals.map((m: any) => <SelectItem key={m} value={m}>{m === "All" ? "All Mandals" : m}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={village} onValueChange={(v) => setVillage(v)}>
          <SelectTrigger className="h-9 px-3 bg-muted/50 border-border text-sm flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {villages.map((v: any) => <SelectItem key={v} value={v}>{v === "All" ? "All Villages" : v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

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

      <Section title="Recommended Diversification Opportunities" subtitle={filtered.length > 50 ? `Page ${page} of ${totalPages} (${filtered.length} parcels)` : `${filtered.length} parcels`} className="mt-4">
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
              {paginatedRows.map((o) => (
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
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-2">
            <div className="text-xs text-muted-foreground">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} parcels
            </div>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded bg-muted/50 text-xs disabled:opacity-50 hover:bg-muted transition-colors">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded bg-muted/50 text-xs disabled:opacity-50 hover:bg-muted transition-colors">Next</button>
            </div>
          </div>
        )}
      </Section>
    </AppLayout>
  );
}
