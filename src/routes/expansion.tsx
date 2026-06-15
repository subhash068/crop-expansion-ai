import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, ArrowRight, Target, Map as MapIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useGroundTruth, useSuitability } from "@/lib/data";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/expansion")({
  component: ExpansionEngine,
});

function ExpansionEngine() {
  const gt = useGroundTruth().data ?? [];
  const suit = useSuitability().data ?? [];
  const [district, setDistrict] = useState<string>("All");
  const [mandal, setMandal] = useState<string>("All");
  const [currentCrop, setCurrentCrop] = useState<string>("All");
  const [targetCrop, setTargetCrop] = useState<string>("All");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const districts = useMemo(() => ["All", ...new Set(gt.map((p: any) => p.district).filter(Boolean))], [gt]);
  const mandals = useMemo(() => ["All", ...new Set(gt.filter((p: any) => district === "All" || p.district === district).map((p: any) => p.mandal).filter(Boolean))], [gt, district]);

  // Merge parcels by village
  const aggregatedData = useMemo(() => {
    // Map of parcel to current crop
    const currentCropMap = new Map();
    gt.forEach((p: any) => {
      if (p.parcel_id) currentCropMap.set(p.parcel_id, { crop: p.crop_type, district: p.district, mandal: p.mandal, village: p.village });
    });

    const villageMap = new Map();

    suit.forEach((s: any) => {
      const cur = currentCropMap.get(s.parcel_id);
      if (!cur) return;
      
      const vKey = `${cur.district}_${cur.mandal}_${cur.village}`;
      if (!villageMap.has(vKey)) {
        villageMap.set(vKey, {
          district: cur.district,
          mandal: cur.mandal,
          village: cur.village,
          parcels: 0,
          totalScore: 0,
          currentCrops: {} as Record<string, number>,
          recCrops: {} as Record<string, number>,
        });
      }

      const vData = villageMap.get(vKey);
      vData.parcels++;
      vData.totalScore += s.suitability_score;
      
      const cCrop = cur.crop || "Unknown";
      const rCrop = s.recommended_crop || "Unknown";

      vData.currentCrops[cCrop] = (vData.currentCrops[cCrop] || 0) + 1;
      vData.recCrops[rCrop] = (vData.recCrops[rCrop] || 0) + 1;
    });

    return Array.from(villageMap.values()).map((v: any) => {
      // Find dominant current crop
      let domCur = "Unknown";
      let maxCur = 0;
      for (const [c, cnt] of Object.entries(v.currentCrops)) {
        if ((cnt as number) > maxCur) { maxCur = cnt as number; domCur = c; }
      }

      // Find dominant recommended crop (exclude current crop if we want actual shifts)
      let domRec = "Unknown";
      let maxRec = 0;
      for (const [c, cnt] of Object.entries(v.recCrops)) {
        if (c !== domCur && (cnt as number) > maxRec) { maxRec = cnt as number; domRec = c; }
      }

      if (maxRec === 0) {
         // fallback if no shift is recommended
         for (const [c, cnt] of Object.entries(v.recCrops)) {
           if ((cnt as number) > maxRec) { maxRec = cnt as number; domRec = c; }
         }
      }

      return {
        district: v.district,
        mandal: v.mandal,
        village: v.village,
        dominantCurrent: domCur,
        dominantRecommended: domRec,
        affectedParcels: v.parcels,
        confidence: Math.round(v.totalScore / v.parcels)
      };
    }).filter(v => v.dominantCurrent !== v.dominantRecommended);

  }, [gt, suit]);

  const currentCrops = useMemo(() => ["All", ...new Set(aggregatedData.map(d => d.dominantCurrent).filter(Boolean))], [aggregatedData]);
  const targetCrops = useMemo(() => ["All", ...new Set(aggregatedData.map(d => d.dominantRecommended).filter(Boolean))], [aggregatedData]);

  const filtered = useMemo(() => {
    let result = aggregatedData;
    if (district !== "All") result = result.filter(o => o.district === district);
    if (mandal !== "All") result = result.filter(o => o.mandal === mandal);
    if (currentCrop !== "All") result = result.filter(o => o.dominantCurrent === currentCrop);
    if (targetCrop !== "All") result = result.filter(o => o.dominantRecommended === targetCrop);
    return result.sort((a, b) => b.confidence - a.confidence);
  }, [aggregatedData, district, mandal, currentCrop, targetCrop]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedRows = useMemo(() => {
    return filtered.slice((page - 1) * pageSize, page * pageSize);
  }, [filtered, page, pageSize]);

  return (
    <AppLayout>
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <PageHeader
        title="Crop Expansion Prediction Engine"
        subtitle="Village and mandal-level predictive modeling for strategic crop shifts"
        actions={
          <div className="flex gap-2">
             <div className="px-4 py-1.5 rounded-lg bg-primary/20 text-primary border border-primary/30 font-medium flex items-center gap-2">
               <Target className="size-4" />
               Expansion Model Active
             </div>
          </div>
        }
      />

      <div className="flex gap-3 mb-6">
        <Select value={district} onValueChange={(v) => { setDistrict(v); setMandal("All"); setPage(1); }}>
          <SelectTrigger className="h-9 px-3 bg-muted/50 border-border text-sm w-[150px]">
            <SelectValue placeholder="All Districts" />
          </SelectTrigger>
          <SelectContent>
            {districts.map((d) => <SelectItem key={d as string} value={d as string}>{d === "All" ? "All Districts" : d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={mandal} onValueChange={(v) => { setMandal(v); setPage(1); }}>
          <SelectTrigger className="h-9 px-3 bg-muted/50 border-border text-sm w-[150px]">
            <SelectValue placeholder="All Mandals" />
          </SelectTrigger>
          <SelectContent>
            {mandals.map((m) => <SelectItem key={m as string} value={m as string}>{m === "All" ? "All Mandals" : m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={currentCrop} onValueChange={(v) => { setCurrentCrop(v); setPage(1); }}>
          <SelectTrigger className="h-9 px-3 bg-muted/50 border-border text-sm w-[180px]">
            <SelectValue placeholder="From: All Crops" />
          </SelectTrigger>
          <SelectContent>
            {currentCrops.map((c) => <SelectItem key={c as string} value={c as string}>{c === "All" ? "From: All Crops" : `From: ${c}`}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={targetCrop} onValueChange={(v) => { setTargetCrop(v); setPage(1); }}>
          <SelectTrigger className="h-9 px-3 bg-muted/50 border-border text-sm w-[180px]">
            <SelectValue placeholder="To: All Crops" />
          </SelectTrigger>
          <SelectContent>
            {targetCrops.map((c) => <SelectItem key={c as string} value={c as string}>{c === "All" ? "To: All Crops" : `To: ${c}`}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 text-muted-foreground mb-2">
            <MapIcon className="size-5" />
            <span className="font-medium">Total Villages Analyzed</span>
          </div>
          <div className="text-3xl font-bold">{filtered.length}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 text-muted-foreground mb-2">
            <TrendingUp className="size-5" />
            <span className="font-medium">Highest Confidence Shift</span>
          </div>
          <div className="text-3xl font-bold text-primary">
            {filtered[0] ? `${filtered[0].dominantCurrent} → ${filtered[0].dominantRecommended}` : "—"}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 text-muted-foreground mb-2">
            <Target className="size-5" />
            <span className="font-medium">Avg. Prediction Confidence</span>
          </div>
          <div className="text-3xl font-bold">
            {filtered.length > 0 ? Math.round(filtered.reduce((a, b) => a + b.confidence, 0) / filtered.length) : 0}%
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">Village / Mandal</th>
                <th className="px-6 py-4 font-medium">Current Dominant Crop</th>
                <th className="px-6 py-4 font-medium">Recommended Shift</th>
                <th className="px-6 py-4 font-medium">Affected Parcels</th>
                <th className="px-6 py-4 font-medium">Confidence Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedRows.map((row, i) => (
                <tr key={i} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium">{row.village}</div>
                    <div className="text-xs text-muted-foreground">{row.mandal}, {row.district}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-md bg-muted/50 border border-border">
                      {row.dominantCurrent}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <ArrowRight className="size-4" />
                      {row.dominantRecommended}
                    </div>
                  </td>
                  <td className="px-6 py-4">{row.affectedParcels}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden w-24">
                        <div 
                          className="h-full rounded-full bg-primary" 
                          style={{ width: `${row.confidence}%` }}
                        />
                      </div>
                      <span className="font-medium">{row.confidence}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-sm">
            <div className="text-muted-foreground">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} villages
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-md bg-muted/50 text-foreground disabled:opacity-50 hover:bg-muted"
              >
                Prev
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-md bg-muted/50 text-foreground disabled:opacity-50 hover:bg-muted"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </AppLayout>
  );
}
