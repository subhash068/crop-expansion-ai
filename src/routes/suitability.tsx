import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Section, KpiCard, Badge } from "@/components/Kpi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useGroundTruth, useSuitability, cropCategory } from "@/lib/data";
import { Map as MapIcon, Award, Layers } from "lucide-react";

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
  const [page, setPage] = useState(1);
  const [selectedParcel, setSelectedParcel] = useState<any>(null);

  const [district, setDistrict] = useState<string>("All");
  const [mandal, setMandal] = useState<string>("All");
  const [village, setVillage] = useState<string>("All");
  const [suitClass, setSuitClass] = useState<string>("All");

  const districts = useMemo(() => ["All", ...new Set(gt.map((p: any) => p.district).filter(Boolean))], [gt]);
  const mandals = useMemo(() => ["All", ...new Set(gt.filter((p: any) => district === "All" || p.district === district).map((p: any) => p.mandal).filter(Boolean))], [gt, district]);
  const villages = useMemo(() => ["All", ...new Set(gt.filter((p: any) => (district === "All" || p.district === district) && (mandal === "All" || p.mandal === mandal)).map((p: any) => p.village).filter(Boolean))], [gt, district, mandal]);

  const data = useMemo(() => {
    const gMap = new Map(gt.filter((g) => g.season === season).map((g) => [g.parcel_id, g]));
    let result = suit.filter((s) => s.season === season && cropCategory(s.recommended_crop) === target)
      .map((s) => {
        const g = gMap.get(s.parcel_id);
        return { ...s, district: g?.district ?? "", village: g?.village ?? "", mandal: g?.mandal ?? "", area: g?.land_area_acres ?? 0 };
      });
      
    if (district !== "All") result = result.filter(o => o.district === district);
    if (mandal !== "All") result = result.filter(o => o.mandal === mandal);
    if (village !== "All") result = result.filter(o => o.village === village);
    if (suitClass !== "All") {
      result = result.filter(o => {
        if (suitClass === "Highly Suitable") return o.suitability_score >= 80;
        if (suitClass === "Suitable") return o.suitability_score >= 65 && o.suitability_score < 80;
        if (suitClass === "Moderately Suitable") return o.suitability_score >= 50 && o.suitability_score < 65;
        if (suitClass === "Unsuitable") return o.suitability_score < 50;
        return true;
      });
    }
    
    return result;
  }, [suit, gt, target, season, district, mandal, village, suitClass]);

  const counts = {
    high: data.filter((d) => d.suitability_score >= 80).length,
    suit: data.filter((d) => d.suitability_score >= 65 && d.suitability_score < 80).length,
    mod: data.filter((d) => d.suitability_score >= 50 && d.suitability_score < 65).length,
    un: data.filter((d) => d.suitability_score < 50).length,
  };

  const sortedData = useMemo(() => [...data].sort((a, b) => b.suitability_score - a.suitability_score), [data]);
  const pageSize = 50;
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedRows = useMemo(() => {
    return sortedData.slice((page - 1) * pageSize, page * pageSize);
  }, [sortedData, page, pageSize]);

  return (
    <AppLayout>
      <PageHeader
        title="Suitability Mapping"
        subtitle="0–100 suitability score combining soil, rainfall, temperature, irrigation & historical yield"
        actions={
          <div className="flex gap-2">
            <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border">
              {(["Millets", "Pulses", "Oilseeds"] as const).map((t) => (
                <button key={t} onClick={() => { setTarget(t); setPage(1); }}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${target === t ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border">
              {["Kharif", "Rabi", "Summer"].map((s) => (
                <button key={s} onClick={() => { setSeason(s); setPage(1); }}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${season === s ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="flex gap-3 mb-6">
        <Select value={district} onValueChange={(v) => { setDistrict(v); setMandal("All"); setVillage("All"); setPage(1); }}>
          <SelectTrigger className="h-9 px-3 bg-muted/50 border-border text-sm w-[150px]">
            <SelectValue placeholder="All Districts" />
          </SelectTrigger>
          <SelectContent>
            {districts.map((d) => <SelectItem key={d as string} value={d as string}>{d === "All" ? "All Districts" : d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={mandal} onValueChange={(v) => { setMandal(v); setVillage("All"); setPage(1); }}>
          <SelectTrigger className="h-9 px-3 bg-muted/50 border-border text-sm w-[150px]">
            <SelectValue placeholder="All Mandals" />
          </SelectTrigger>
          <SelectContent>
            {mandals.map((m) => <SelectItem key={m as string} value={m as string}>{m === "All" ? "All Mandals" : m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={village} onValueChange={(v) => { setVillage(v); setPage(1); }}>
          <SelectTrigger className="h-9 px-3 bg-muted/50 border-border text-sm w-[150px]">
            <SelectValue placeholder="All Villages" />
          </SelectTrigger>
          <SelectContent>
            {villages.map((v) => <SelectItem key={v as string} value={v as string}>{v === "All" ? "All Villages" : v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={suitClass} onValueChange={(v) => { setSuitClass(v); setPage(1); }}>
          <SelectTrigger className="h-9 px-3 bg-muted/50 border-border text-sm w-[180px]">
            <SelectValue placeholder="All Suitability Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Suitability Classes</SelectItem>
            <SelectItem value="Highly Suitable">Highly Suitable</SelectItem>
            <SelectItem value="Suitable">Suitable</SelectItem>
            <SelectItem value="Moderately Suitable">Moderately Suitable</SelectItem>
            <SelectItem value="Unsuitable">Unsuitable</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Highly Suitable" value={counts.high} icon={Award} />
        <KpiCard label="Suitable" value={counts.suit} icon={Layers} accent="info" />
        <KpiCard label="Moderately Suitable" value={counts.mod} icon={MapIcon} accent="warning" />
        <KpiCard label="Unsuitable" value={counts.un} icon={MapIcon} />
      </div>

      <Section title={`${target} Expansion Zones: Suitability Heatmap`} subtitle="Each tile = one parcel, color = suitability score" className="mt-6">
        <div className="grid grid-cols-12 sm:grid-cols-20 md:grid-cols-30 lg:grid-cols-[repeat(40,minmax(0,1fr))] gap-1">
          {data.slice(0, 800).map((d) => {
            const c = category(d.suitability_score);
            return (
              <div key={d.parcel_id} title={`${d.parcel_id} · ${d.village} · ${d.suitability_score.toFixed(0)}`}
                onClick={() => setSelectedParcel(d)}
                className="aspect-square rounded shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] hover:scale-150 hover:shadow-[0_0_20px_rgba(0,0,0,0.8)] hover:z-10 transition-all duration-200 cursor-pointer"
                style={{ background: c.color, opacity: 0.6 + (d.suitability_score / 100) * 0.4 }} />
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
              {paginatedRows.map((d) => {
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
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
              <div className="text-xs text-muted-foreground">
                Showing <span className="font-medium text-foreground">{(page - 1) * pageSize + 1}</span> to <span className="font-medium text-foreground">{Math.min(page * pageSize, sortedData.length)}</span> of <span className="font-medium text-foreground">{sortedData.length}</span> parcels
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs rounded-md bg-muted/50 text-foreground disabled:opacity-50 hover:bg-muted transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs rounded-md bg-muted/50 text-foreground disabled:opacity-50 hover:bg-muted transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </Section>

      <Dialog open={!!selectedParcel} onOpenChange={(o) => !o && setSelectedParcel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Parcel Details: {selectedParcel?.parcel_id}</DialogTitle>
            <DialogDescription>{selectedParcel?.village}, {selectedParcel?.mandal}</DialogDescription>
          </DialogHeader>
          {selectedParcel && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><span className="text-muted-foreground text-sm">Target Crop</span><p className="font-medium">{target}</p></div>
              <div><span className="text-muted-foreground text-sm">Overall Score</span><p className="font-medium text-primary text-xl">{selectedParcel.suitability_score.toFixed(1)} / 100</p></div>
              <div><span className="text-muted-foreground text-sm">Soil Score</span><p className="font-medium">{selectedParcel.soil_score} / 100</p></div>
              <div><span className="text-muted-foreground text-sm">Rainfall Score</span><p className="font-medium">{selectedParcel.rainfall_score} / 100</p></div>
              <div><span className="text-muted-foreground text-sm">Temperature Score</span><p className="font-medium">{selectedParcel.temperature_score} / 100</p></div>
              <div><span className="text-muted-foreground text-sm">Irrigation Score</span><p className="font-medium">{selectedParcel.irrigation_score} / 100</p></div>
              <div><span className="text-muted-foreground text-sm">Yield History</span><p className="font-medium">{selectedParcel.historical_yield_score} / 100</p></div>
              <div><span className="text-muted-foreground text-sm">Suitability Class</span><p className="font-medium"><Badge variant={category(selectedParcel.suitability_score).variant}>{category(selectedParcel.suitability_score).label}</Badge></p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
