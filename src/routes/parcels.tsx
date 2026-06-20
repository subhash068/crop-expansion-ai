import { createFileRoute } from "@tanstack/react-router";
import { Search, MapPin, Wheat, Droplets, Activity, TrendingUp } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Section, KpiCard, Badge } from "@/components/Kpi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGroundTruth, useSatellite, useSoil, useWeather, useYield } from "@/lib/data";
import { usePredictCrop } from "@/lib/api";
import { Loader2, BrainCircuit } from "lucide-react";

export const Route = createFileRoute("/parcels")({
  head: () => ({ meta: [{ title: "Parcel Intelligence — CropVision AI" }] }),
  component: Parcels,
});

function Parcels() {
  const gt = useGroundTruth().data ?? [];
  const sat = useSatellite().data ?? [];
  const soil = useSoil().data ?? [];
  const weather = useWeather().data ?? [];
  const yields = useYield().data ?? [];
  const [q, setQ] = useState("");
  const [filterMandal, setFilterMandal] = useState("All");
  const [filterCrop, setFilterCrop] = useState("All");
  const [selected, setSelected] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 40;

  const parcels = useMemo(() => {
    const ids = Array.from(new Set(gt.map((g) => g.parcel_id)));
    return ids.map((id) => gt.find((g) => g.parcel_id === id)!);
  }, [gt]);

  const mandals = useMemo(() => Array.from(new Set(parcels.map(p => p.mandal))).sort(), [parcels]);
  const crops = useMemo(() => Array.from(new Set(parcels.map(p => p.crop_type))).sort(), [parcels]);

  const filtered = useMemo(() => {
    let result = parcels;
    if (filterMandal !== "All") result = result.filter(p => p.mandal === filterMandal);
    if (filterCrop !== "All") result = result.filter(p => p.crop_type === filterCrop);
    
    if (q) {
      const ql = q.toLowerCase();
      result = result.filter((p) =>
        p.parcel_id.toLowerCase().includes(ql) ||
        p.village.toLowerCase().includes(ql) ||
        p.mandal.toLowerCase().includes(ql) ||
        p.survey_no.toLowerCase().includes(ql)
      );
    }
    return result;
  }, [parcels, q, filterMandal, filterCrop]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  useEffect(() => { setPage(1); }, [q, filterMandal, filterCrop]);

  const sel = selected ?? paginated[0]?.parcel_id;
  const detail = useMemo(() => {
    if (!sel) return null;
    const all = gt.filter((g) => g.parcel_id === sel);
    const kharif = all.find((g) => g.season === "Kharif") ?? all[0];
    const s = sat.find((x) => x.parcel_id === sel && x.season === "Kharif");
    const so = soil.find((x) => x.parcel_id === sel);
    const w = weather.find((x) => x.parcel_id === sel && x.season === "Kharif");
    const y = yields.find((x) => x.parcel_id === sel && x.season === "Kharif");
    return { base: kharif, sat: s, soil: so, weather: w, yield: y };
  }, [sel, gt, sat, soil, weather, yields]);

  const { data: liveCrop, isLoading: isLoadingLiveCrop, error: liveCropError } = usePredictCrop(detail?.sat);

  return (
    <AppLayout>
      <PageHeader title="Parcel Intelligence" subtitle="Search & inspect parcel-level agronomic data" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Search Parcels" className="lg:col-span-1">
          <div className="relative mb-3 flex flex-col gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Parcel ID, village, mandal, survey no."
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted/50 border border-border text-sm outline-none focus:ring-2 focus:ring-ring/50" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={filterMandal} onValueChange={setFilterMandal}>
                <SelectTrigger className="h-8 text-xs bg-muted/50 border-border">
                  <SelectValue placeholder="All Mandals" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Mandals</SelectItem>
                  {mandals.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              
              <Select value={filterCrop} onValueChange={setFilterCrop}>
                <SelectTrigger className="h-8 text-xs bg-muted/50 border-border">
                  <SelectValue placeholder="All Crops" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Crops</SelectItem>
                  {crops.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1 max-h-[520px] overflow-auto -mx-2 px-2">
            {paginated.map((p) => (
              <button key={p.parcel_id} onClick={() => setSelected(p.parcel_id)}
                className={`w-full text-left p-2.5 rounded-lg border transition-colors ${sel === p.parcel_id ? "bg-primary/10 border-primary/50" : "border-transparent hover:bg-muted/40"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-medium">{p.parcel_id}</span>
                  <span className="text-[10px] text-muted-foreground">{p.land_area_acres} ac</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{p.village} · {p.mandal}</div>
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-3 mt-1 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Pg {page}/{totalPages}
              </span>
              <div className="flex gap-1">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page === 1}
                  className="px-2 py-1 text-xs rounded border border-border hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  Prev
                </button>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                  disabled={page === totalPages}
                  className="px-2 py-1 text-xs rounded border border-border hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Section>

        <div className="lg:col-span-2 space-y-4">
          {detail?.base ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard label="Area" value={`${detail.base.land_area_acres} ac`} icon={MapPin} />
                <KpiCard label="Ground Truth Crop" value={detail.base.crop_type} icon={Wheat} accent="info" />
                <KpiCard 
                  label="Live AI Prediction" 
                  value={
                    isLoadingLiveCrop ? <Loader2 className="size-4 animate-spin" /> :
                    liveCropError ? "Error" :
                    liveCrop?.predicted_crop ?? "—"
                  } 
                  icon={BrainCircuit} 
                  accent={liveCrop?.predicted_crop === detail.base.crop_type ? "primary" : "warning"} 
                  trend={liveCrop ? { value: `${liveCrop.confidence}% conf.`, positive: true } : undefined}
                />
                <KpiCard label="Yield" value={`${detail.yield?.yield_kg_per_acre?.toFixed(0) ?? "—"} kg/ac`} icon={TrendingUp} accent="warning" />
              </div>

              <Section 
                title={<><span className="text-xs font-normal text-muted-foreground uppercase tracking-wider mr-2">Parcel ID:</span>{detail.base.parcel_id}</>} 
                subtitle={
                  <div className="flex flex-col gap-0.5 mt-2 text-sm text-muted-foreground">
                    <div><span className="font-medium text-foreground">Farmer Name:</span> {detail.base.farmer_name}</div>
                    <div><span className="font-medium text-foreground">Village:</span> {detail.base.village}</div>
                    <div><span className="font-medium text-foreground">Mandal:</span> {detail.base.mandal}</div>
                  </div>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <Field label="Survey No." value={detail.base.survey_no} />
                  <Field label="Irrigation" value={detail.base.irrigation_type} />
                  <Field label="Soil Type" value={detail.base.soil_type} />
                  <Field label="Crop Stage" value={detail.base.crop_stage} />
                  <Field label="Previous Crop" value={detail.base.previous_crop || "—"} />
                  <Field label="Coordinates" value={`${detail.base.latitude.toFixed(4)}, ${detail.base.longitude.toFixed(4)}`} />
                </div>
              </Section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Section title="Satellite Indices">
                  <div className="space-y-2 text-sm">
                    <Field label="NDVI" value={detail.sat?.NDVI?.toFixed(3) ?? "—"} />
                    <Field label="EVI" value={detail.sat?.EVI?.toFixed(3) ?? "—"} />
                    <Field label="SAVI" value={detail.sat?.SAVI?.toFixed(3) ?? "—"} />
                    <Field label="NDWI" value={detail.sat?.NDWI?.toFixed(3) ?? "—"} />
                    <Field label="Cloud Cover" value={`${detail.sat?.cloud_cover_percent?.toFixed(1) ?? "—"}%`} />
                  </div>
                </Section>
                <Section title="Soil & Weather">
                  <div className="space-y-2 text-sm">
                    <Field label="pH" value={detail.soil?.pH?.toFixed(2) ?? "—"} />
                    <Field label="Organic Carbon" value={`${detail.soil?.organic_carbon?.toFixed(2) ?? "—"} %`} />
                    <Field label="Fertility Score" value={`${detail.soil?.soil_fertility_score || Math.min(100, Math.round(50 + (detail.soil?.organic_carbon || 0.5) * 30))}/100`} />
                    <Field label="Rainfall (Kharif)" value={`${detail.weather?.total_rainfall_mm?.toFixed(0) ?? "—"} mm`} />
                    <Field label="Avg Temp" value={`${detail.weather?.avg_temperature_c?.toFixed(1) ?? "—"} °C`} />
                    {(() => {
                      const risk = detail.weather?.drought_risk || ((detail.weather?.total_rainfall_mm ?? 500) < 450 ? "High" : (detail.weather?.total_rainfall_mm ?? 500) < 650 ? "Medium" : "Low");
                      return (
                        <Field label="Drought Risk" value={<Badge variant={risk === "Low" ? "success" : risk === "Medium" ? "warning" : "danger"}>{risk}</Badge>} />
                      );
                    })()}
                  </div>
                </Section>
              </div>

              <Section title="Yield Potential">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><div className="text-xs text-muted-foreground">Production</div><div className="font-semibold text-lg">{detail.yield?.production_kg?.toFixed(0)} kg</div></div>
                  <div><div className="text-xs text-muted-foreground">Market Price</div><div className="font-semibold text-lg">₹{detail.yield?.market_price_per_kg}/kg</div></div>
                  <div><div className="text-xs text-muted-foreground">Gross Income</div><div className="font-semibold text-lg text-success">₹{detail.yield?.gross_income_rs?.toLocaleString()}</div></div>
                </div>
              </Section>
            </>
          ) : <div className="text-center text-muted-foreground py-12">Select a parcel.</div>}
        </div>
      </div>
    </AppLayout>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-border/40">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
