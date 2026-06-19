import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from "recharts";
import { Mountain, FlaskConical, Leaf, Activity } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { KpiCard, Section } from "@/components/Kpi";
import { useSoil, groupBy } from "@/lib/data";
import { chartTooltip } from "./index";
import { useMemo } from "react";

export const Route = createFileRoute("/soil")({
  head: () => ({ meta: [{ title: "Soil Intelligence — CropVision AI" }] }),
  component: Soil,
});

const COLORS = ["#5fcf80", "#f0c560", "#6aa9ff", "#ff7e6a", "#b07eff", "#4bd6c8"];

function Soil() {
  const s = useSoil().data ?? [];
  const kharif = s.filter((r) => r.season === "Kharif");
  const avg = (k: keyof typeof s[number]) => kharif.length ? kharif.reduce((a, r) => a + (r[k] as number), 0) / kharif.length : 0;

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
      <PageHeader title="Soil Intelligence" subtitle="APSAC soil maps · fertility & nutrient profiling" />

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

      <Section title="Parcel Soil Health Records" subtitle={`${kharif.length} total · top 40 shown`} className="mt-4">
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px]">
              <tr>{["Parcel", "Type", "Texture", "pH", "OC %", "N", "P", "K", "Zn", "Drainage", "Fertility"].map(h => <th key={h} className="text-left p-2.5">{h}</th>)}</tr>
            </thead>
            <tbody>
              {kharif.slice(0, 40).map((r) => (
                <tr key={r.parcel_id} className="border-t border-border hover:bg-muted/20">
                  <td className="p-2.5 font-mono">{r.parcel_id}</td>
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
