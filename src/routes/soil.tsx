import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from "recharts";
import { Mountain, FlaskConical, Leaf, Activity, Beaker, HelpCircle } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { KpiCard, Section } from "@/components/Kpi";
import { useSoil, groupBy } from "@/lib/data";
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
  const kharif = s.filter((r) => r.season === "Kharif");
  const avg = (k: keyof typeof s[number]) => kharif.length ? kharif.reduce((a, r) => a + (r[k] as number), 0) / kharif.length : 0;

  const [selectedParcelId, setSelectedParcelId] = useState<string>("");
  const [selectedCrop, setSelectedCrop] = useState<keyof typeof RECOMMENDATIONS>("Millets");

  // Fallback to first parcel if none is selected
  const activeParcel = useMemo(() => {
    if (!kharif.length) return null;
    return kharif.find((p) => p.parcel_id === selectedParcelId) || kharif[0];
  }, [kharif, selectedParcelId]);

  // Set initial selected parcel once data is loaded
  useMemo(() => {
    if (kharif.length && !selectedParcelId) {
      setSelectedParcelId(kharif[0].parcel_id);
    }
  }, [kharif, selectedParcelId]);

  const advisoryData = useMemo(() => {
    if (!activeParcel) return null;
    const targets = RECOMMENDATIONS[selectedCrop];
    const actualN = activeParcel.nitrogen_kg_ha ?? 0;
    const actualP = activeParcel.phosphorus_kg_ha ?? 0;
    const actualK = activeParcel.potassium_kg_ha ?? 0;

    const defN = Math.max(0, targets.N - actualN);
    const defP = Math.max(0, targets.P - actualP);
    const defK = Math.max(0, targets.K - actualK);

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
    Object.entries(groupBy(kharif, (r) => r.soil_type))
      .map(([name, list]) => ({ name, value: list.length })), [kharif]);

  const drainage = useMemo(() =>
    Object.entries(groupBy(kharif, (r) => r.drainage_class))
      .map(([name, list]) => ({ name, count: list.length })), [kharif]);

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
                  {kharif.slice(0, 30).map((p) => (
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

            <div className="glass rounded-xl p-4 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
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

              <div className="flex flex-col justify-between">
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

                <div className="text-[11px] text-muted-foreground mt-3 flex items-start gap-1.5">
                  <Beaker className="size-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    Advises are calculated using Nitrogen (46%), Single Superphosphate (16%), and Muriate of Potash (60%) formulations adjusted for parcel-level soil health.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Section>
      )}

      <Section title="Parcel Soil Health Records" subtitle={`${kharif.length} total · top 40 shown`} className="mt-4">
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px]">
              <tr>{["Parcel", "Type", "Texture", "pH", "OC %", "N", "P", "K", "Zn", "Drainage", "Fertility"].map(h => <th key={h} className="text-left p-2.5">{h}</th>)}</tr>
            </thead>
            <tbody>
              {kharif.slice(0, 40).map((r) => (
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
                  <td className="p-2.5 font-semibold">{r.soil_fertility_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </AppLayout>
  );
}
