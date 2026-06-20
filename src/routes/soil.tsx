import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from "recharts";
import { Mountain, FlaskConical, Leaf, Activity, Beaker, HelpCircle } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { KpiCard, Section } from "@/components/Kpi";
import { useSoil, useParcels, groupBy } from "@/lib/data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { chartTooltip } from "./index";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/soil")({
  head: () => ({
    meta: [
      { title: "Soil Intelligence — AI Soil Mapping & Nutrient Analytics AP | CropVision AI" },
      { name: "description", content: "APSAC-based soil maps and fertilizer advisory system for Anantapur, Andhra Pradesh. Interactive parcel-level nutrient profiling." },
      { name: "keywords", content: "AI soil mapping, soil nutrient analytics, fertilizer advisory system, parcel-level soil health, precision agriculture Andhra Pradesh" }
    ]
  }),
  component: Soil,
});

const COLORS = ["#5fcf80", "#f0c560", "#6aa9ff", "#ff7e6a", "#b07eff", "#4bd6c8"];

// Recommended doses for crops in Andhra Pradesh (N - P - K in kg/hectare)
const RECOMMENDATIONS = {
  Millets: { N: 80, P: 40, K: 40, label: "Millets (Sorghum/Bajra/Ragi)" },
  Pulses: { N: 20, P: 50, K: 0, label: "Pulses (Red Gram/Bengal Gram)" },
  Oilseeds: { N: 30, P: 40, K: 50, label: "Oilseeds (Groundnut/Sunflower)" },
};

function Soil() {
  const s = useSoil().data ?? [];
  const parcelsData = useParcels().data ?? [];
  const [district, setDistrict] = useState<string>("All");
  const [mandal, setMandal] = useState<string>("All");
  const [village, setVillage] = useState<string>("All");
  const [season, setSeason] = useState<string>("Kharif");

  const districts = useMemo(() => ["All", ...new Set(parcelsData.map((p: any) => p.district).filter(Boolean))] as string[], [parcelsData]);
  const mandals = useMemo(() => ["All", ...new Set(parcelsData.filter((p: any) => district === "All" || p.district === district).map((p: any) => p.mandal).filter(Boolean))] as string[], [parcelsData, district]);
  const villages = useMemo(() => ["All", ...new Set(parcelsData.filter((p: any) => (district === "All" || p.district === district) && (mandal === "All" || p.mandal === mandal)).map((p: any) => p.village).filter(Boolean))] as string[], [parcelsData, district, mandal]);
  const seasons = useMemo(() => ["All", ...new Set(s.map((r: any) => r.season).filter(Boolean))] as string[], [s]);

  const parcelMap = useMemo(() => new Map(parcelsData.map((p) => [p.parcel_id, p])), [parcelsData]);

  const filteredData = useMemo(() => {
    return s.filter((r) => {
      if (season !== "All" && r.season !== season) return false;
      const p = parcelMap.get(r.parcel_id) as any;
      if (!p) return false;
      if (district !== "All" && p.district !== district) return false;
      if (mandal !== "All" && p.mandal !== mandal) return false;
      if (village !== "All" && p.village !== village) return false;
      return true;
    });
  }, [s, parcelMap, season, district, mandal, village]);

  const getFertilityScore = (r: typeof s[number]) => {
    if (r.soil_fertility_score) return r.soil_fertility_score;
    let score = 0;
    score += Math.min(30, (r.nitrogen_kg_ha || 0) / 250 * 30);
    score += Math.min(20, (r.phosphorus_kg_ha || 0) / 30 * 20);
    score += Math.min(20, (r.potassium_kg_ha || 0) / 250 * 20);
    score += Math.min(20, (r.organic_carbon || 0) / 0.8 * 20);
    const ph = r.pH || 7.0;
    score += 10 - Math.min(10, Math.abs(ph - 7.0) * 5);
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const avg = (k: keyof typeof s[number]) => filteredData.length ? filteredData.reduce((a, r) => {
    if (k === 'soil_fertility_score') return a + getFertilityScore(r);
    return a + (r[k] as number || 0);
  }, 0) / filteredData.length : 0;

  const [selectedParcelId, setSelectedParcelId] = useState<string>("");
  const [selectedCrop, setSelectedCrop] = useState<keyof typeof RECOMMENDATIONS>("Millets");
  const [page, setPage] = useState(1);
  const pageSize = 45;
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedRows = useMemo(() => filteredData.slice((page - 1) * pageSize, page * pageSize), [filteredData, page, pageSize]);

  // Fallback to first parcel if none is selected
  const activeParcel = useMemo(() => {
    if (!filteredData.length) return null;
    return filteredData.find((p) => p.parcel_id === selectedParcelId) || filteredData[0];
  }, [filteredData, selectedParcelId]);

  // Set initial selected parcel once data is loaded
  useMemo(() => {
    if (filteredData.length && !selectedParcelId) {
      setSelectedParcelId(filteredData[0].parcel_id);
    }
  }, [filteredData, selectedParcelId]);

  const advisoryData = useMemo(() => {
    if (!activeParcel) return null;
    const targets = RECOMMENDATIONS[selectedCrop];
    const actualN = activeParcel.nitrogen_kg_ha ?? 0;
    const actualP = activeParcel.phosphorus_kg_ha ?? 0;
    const actualK = activeParcel.potassium_kg_ha ?? 0;

    // Adjust recommended fertilizer dose based on soil status (simplified STCR logic)
    // Nitrogen status: Low < 280, Medium 280-560, High > 560
    const adjustN = actualN < 280 ? 1.25 : actualN > 560 ? 0.75 : 1.0;
    // Phosphorus status: Low < 10, Medium 10-25, High > 25
    const adjustP = actualP < 10 ? 1.25 : actualP > 25 ? 0.75 : 1.0;
    // Potassium status: Low < 110, Medium 110-280, High > 280
    const adjustK = actualK < 110 ? 1.25 : actualK > 280 ? 0.75 : 1.0;

    const defN = targets.N * adjustN;
    const defP = targets.P * adjustP;
    const defK = targets.K * adjustK;

    // Urea has 46% N, Single Superphosphate (SSP) has 16% P2O5, Muriate of Potash (MOP) has 60% K2O
    const urea = Math.round(defN / 0.46);
    const ssp = Math.round(defP / 0.16);
    const mop = Math.round(defK / 0.60);

    return {
      targets,
      actual: { N: actualN, P: actualP, K: actualK },
      deficiency: { N: defN, P: defP, K: defK },
      fertilizer: { urea, ssp, mop }
    };
  }, [activeParcel, selectedCrop]);

  const typePie = useMemo(() =>
    Object.entries(groupBy(filteredData, (r) => r.soil_type))
      .map(([name, list]) => ({ name, value: list.length })), [filteredData]);

  const drainage = useMemo(() =>
    Object.entries(groupBy(filteredData, (r) => r.drainage_class))
      .map(([name, list]) => ({ name, count: list.length })), [filteredData]);

  const radar = [
    { metric: "pH (norm)", v: +(avg("pH") * 10).toFixed(0) },
    { metric: "Organic C", v: +(avg("organic_carbon") * 70).toFixed(0) },
    { metric: "Nitrogen", v: +(avg("nitrogen_kg_ha") / 5).toFixed(0) },
    { metric: "Phosphorus", v: +(avg("phosphorus_kg_ha") * 2).toFixed(0) },
    { metric: "Potassium", v: +(avg("potassium_kg_ha") / 5).toFixed(0) },
    { metric: "Zinc", v: +(avg("zinc_ppm") * 30).toFixed(0) },
  ];

  return (
    <AppLayout>
      <PageHeader title="Soil Intelligence" subtitle="APSAC spatial soil maps · fertilizer advisory & nutrient profiling" />

      <div className="flex gap-3 mb-6 mt-4 flex-wrap">
        <Select value={season} onValueChange={(v) => { setSeason(v); setPage(1); }}>
          <SelectTrigger className="h-9 px-3 bg-muted/50 border-border text-sm w-[150px]">
            <SelectValue placeholder="All Seasons" />
          </SelectTrigger>
          <SelectContent>
            {seasons.map((d) => <SelectItem key={d as string} value={d as string}>{d === "All" ? "All Seasons" : d}</SelectItem>)}
          </SelectContent>
        </Select>
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
            {villages.map((m) => <SelectItem key={m as string} value={m as string}>{m === "All" ? "All Villages" : m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Avg Fertility Score" value={`${Math.round(avg("soil_fertility_score"))}/100`} icon={Leaf} />
        <KpiCard label="Avg pH" value={avg("pH").toFixed(2)} icon={FlaskConical} accent="info" />
        <KpiCard label="Avg Organic Carbon" value={`${avg("organic_carbon").toFixed(2)}%`} icon={Activity} accent="accent" />
        <KpiCard label="Soil Depth" value={`${Math.round(avg("soil_depth_cm"))} cm`} icon={Mountain} accent="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Section title="Soil Type Distribution">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={typePie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                {typePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={chartTooltip} itemStyle={{ color: "#fff" }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Nutrient Profile (normalized)">
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radar}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "currentColor" }} />
              <PolarRadiusAxis tick={{ fontSize: 9, fill: "currentColor" }} />
              <Radar dataKey="v" stroke="#5fcf80" fill="#5fcf80" fillOpacity={0.4} />
            </RadarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Drainage Class">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={drainage}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "currentColor" }} />
              <YAxis tick={{ fontSize: 11, fill: "currentColor" }} />
              <Tooltip contentStyle={chartTooltip} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="count" fill="#6aa9ff" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {activeParcel && advisoryData && (
        <Section title="Fertilizer Advisory System" subtitle="APSAC spatial nutrient calculations & tailored N-P-K recommendation engine" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass rounded-xl p-4 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Select Active Parcel</label>
                <select
                  value={selectedParcelId}
                  onChange={(e) => setSelectedParcelId(e.target.value)}
                  className="w-full h-9 rounded-lg bg-muted/50 border border-border px-3 text-xs outline-none focus:ring-2 focus:ring-ring/50"
                >
                  {filteredData.slice(0, 30).map((p) => (
                    <option key={p.parcel_id} value={p.parcel_id} className="bg-background">{p.parcel_id} ({p.soil_type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Select Target Crop Category</label>
                <div className="flex gap-1.5 p-1 rounded-lg bg-muted/40 border border-border">
                  {Object.keys(RECOMMENDATIONS).map((crop) => (
                    <button
                      key={crop}
                      onClick={() => setSelectedCrop(crop as any)}
                      className={`flex-1 py-1 px-2 text-[10px] font-bold rounded transition-all ${selectedCrop === crop ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted/50"}`}
                    >
                      {crop}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-primary/5 rounded-lg p-3 border border-primary/10 text-xs">
                <span className="font-semibold block mb-0.5 text-primary">Agronomic Target Ratio</span>
                Recommended fertilizer dose for <span className="font-semibold">{RECOMMENDATIONS[selectedCrop].label}</span> is{" "}
                <span className="font-mono text-foreground font-semibold">{RECOMMENDATIONS[selectedCrop].N}-{RECOMMENDATIONS[selectedCrop].P}-{RECOMMENDATIONS[selectedCrop].K}</span> kg/ha of N-P-K.
              </div>
            </div>

            <div className="glass rounded-xl p-4">
              <span className="text-xs font-semibold text-muted-foreground block mb-3">Deficiency Assessment (kg/ha)</span>
              <div className="space-y-3">
                {[
                  { name: "Nitrogen (N)", actual: advisoryData.actual.N, target: advisoryData.targets.N, color: "var(--color-primary)" },
                  { name: "Phosphorus (P)", actual: advisoryData.actual.P, target: advisoryData.targets.P, color: "var(--color-info)" },
                  { name: "Potassium (K)", actual: advisoryData.actual.K, target: advisoryData.targets.K, color: "var(--color-accent)" },
                ].map((nut) => {
                  const pct = Math.min(100, Math.round((nut.actual / Math.max(1, nut.target)) * 100));
                  return (
                    <div key={nut.name} className="text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{nut.name}</span>
                        <span className="text-muted-foreground font-mono">{nut.actual.toFixed(0)} / {nut.target} kg/ha</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                        <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: nut.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass rounded-xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-muted-foreground block mb-3">Fertilizer Requirement Recommendation</span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Urea</span>
                    <span className="text-xl font-bold font-mono text-primary">{advisoryData.fertilizer.urea}</span>
                    <span className="text-[9px] text-muted-foreground block mt-0.5">kg / hectare</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">SSP</span>
                    <span className="text-xl font-bold font-mono text-info">{advisoryData.fertilizer.ssp}</span>
                    <span className="text-[9px] text-muted-foreground block mt-0.5">kg / hectare</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">MOP</span>
                    <span className="text-xl font-bold font-mono text-accent">{advisoryData.fertilizer.mop}</span>
                    <span className="text-[9px] text-muted-foreground block mt-0.5">kg / hectare</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground mt-3 flex items-start gap-1.5">
                <Beaker className="size-4 text-primary shrink-0 mt-0.5" />
                <span>
                  Advises are calculated using Nitrogen (46%), Single Superphosphate (16%), and Muriate of Potash (60%) formulations adjusted for parcel-level soil health.
                </span>
              </div>
            </div>
          </div>
        </Section>
      )}

      <Section title="Parcel Soil Health Records" subtitle={filteredData.length > 0 ? `Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, filteredData.length)} of ${filteredData.length} parcels` : "No records found"} className="mt-4">
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px]">
              <tr>{["Parcel", "Type", "Texture", "pH", "OC %", "N", "P", "K", "Zn", "Drainage", "Fertility"].map(h => <th key={h} className="text-left p-2.5">{h}</th>)}</tr>
            </thead>
            <tbody>
              {paginatedRows.map((r) => (
                <tr key={r.parcel_id} onClick={() => setSelectedParcelId(r.parcel_id)} className="border-t border-border hover:bg-muted/20 cursor-pointer">
                  <td className="p-2.5 font-mono text-primary hover:underline">{r.parcel_id}</td>
                  <td className="p-2.5">{r.soil_type}</td>
                  <td className="p-2.5">{r.soil_texture}</td>
                  <td className="p-2.5">{r.pH}</td>
                  <td className="p-2.5">{r.organic_carbon}</td>
                  <td className="p-2.5">{r.nitrogen_kg_ha}</td>
                  <td className="p-2.5">{r.phosphorus_kg_ha}</td>
                  <td className="p-2.5">{r.potassium_kg_ha}</td>
                  <td className="p-2.5">{r.zinc_ppm}</td>
                  <td className="p-2.5">{r.drainage_class}</td>
                  <td className="p-2.5 font-semibold">{getFertilityScore(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1}
                className="px-3 py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent transition-colors text-xs font-semibold"
              >
                Previous
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent transition-colors text-xs font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Section>
    </AppLayout>
  );
}
