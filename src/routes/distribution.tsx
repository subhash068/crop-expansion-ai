import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Section } from "@/components/Kpi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGroundTruth, cropCategory, groupBy, sum, uniq } from "@/lib/data";
import { chartTooltip, renderCustomPieLabel } from "./index";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/distribution")({
  head: () => ({ meta: [{ title: "Crop Distribution — CropVision AI" }] }),
  component: Distribution,
});

const COLORS = ["#5fcf80", "#f0c560", "#6aa9ff", "#ff7e6a", "#b07eff", "#4bd6c8", "#ffb84d", "#7ed6a4"];

function Distribution() {
  const gt = useGroundTruth().data ?? [];
  const [season, setSeason] = useState("Kharif");
  const mandals = useMemo(() => uniq(gt.map((g) => g.mandal)).sort(), [gt]);
  const [mandal, setMandal] = useState<string>("All");

  const rows = useMemo(() => gt.filter((g) =>
    g.season === season && (mandal === "All" || g.mandal === mandal)
  ), [gt, season, mandal]);

  const cropPie = Object.entries(groupBy(rows, (r) => r.crop_type))
    .map(([name, list]) => ({ name, value: Math.round(sum(list, (r) => r.land_area_acres)) }))
    .sort((a, b) => b.value - a.value);

  const villageBreak = Object.entries(groupBy(rows, (r) => r.village))
    .map(([village, list]) => {
      const out: any = { village };
      ["Millets", "Pulses", "Oilseeds", "Cotton", "Paddy", "Other"].forEach((c) => {
        out[c] = Math.round(sum(list.filter((r) => cropCategory(r.crop_type) === c), (r) => r.land_area_acres));
      });
      return out;
    }).sort((a, b) => (b.Millets + b.Pulses + b.Oilseeds) - (a.Millets + a.Pulses + a.Oilseeds)).slice(0, 12);

  const mandalCompare = Object.entries(groupBy(rows.length > 0 && mandal === "All" ? rows : gt.filter((g) => g.season === season), (r) => r.mandal))
    .map(([m, list]) => ({
      mandal: m,
      Millets: Math.round(sum(list.filter((r) => cropCategory(r.crop_type) === "Millets"), (r) => r.land_area_acres)),
      Pulses: Math.round(sum(list.filter((r) => cropCategory(r.crop_type) === "Pulses"), (r) => r.land_area_acres)),
      Oilseeds: Math.round(sum(list.filter((r) => cropCategory(r.crop_type) === "Oilseeds"), (r) => r.land_area_acres)),
    })).sort((a, b) => (b.Millets + b.Pulses + b.Oilseeds) - (a.Millets + a.Pulses + a.Oilseeds)).slice(0, 10);

  return (
    <AppLayout>
      <PageHeader
        title="Crop Distribution Analytics"
        subtitle="Village, mandal and district-level crop area analysis"
        actions={
          <div className="flex gap-2">
            <Select value={mandal} onValueChange={(v) => setMandal(v)}>
              <SelectTrigger className="h-9 px-3 bg-muted/50 border-border text-sm w-[150px]">
                <SelectValue placeholder="All Mandals" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Mandals</SelectItem>
                {mandals.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border">
              {["Kharif", "Rabi", "Summer"].map((s) => (
                <button key={s} onClick={() => setSeason(s)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${season === s ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Crop Mix" subtitle={`${season} ${mandal !== "All" ? "· " + mandal : ""}`}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart margin={{ top: 20, right: 20, bottom: 30, left: 20 }}>
              <Pie data={cropPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} label={renderCustomPieLabel}>
                {cropPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={chartTooltip} itemStyle={{ color: "#fff" }} />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Mandal Comparison — Millets, Pulses, Oilseeds" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mandalCompare}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="mandal" tick={{ fontSize: 10, fill: "currentColor" }} angle={-25} textAnchor="end" height={60} interval={0} />
              <YAxis tick={{ fontSize: 11, fill: "currentColor" }} />
              <Tooltip contentStyle={chartTooltip} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Millets" stackId="a" fill="#5fcf80" />
              <Bar dataKey="Pulses" stackId="a" fill="#6aa9ff" />
              <Bar dataKey="Oilseeds" stackId="a" fill="#f0c560" />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      <Section title="Village-Level Crop Composition" subtitle="Acres by category — top 12 villages" className="mt-4">
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={villageBreak}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="village" tick={{ fontSize: 10, fill: "currentColor" }} angle={-30} textAnchor="end" height={70} interval={0} />
            <YAxis tick={{ fontSize: 11, fill: "currentColor" }} />
            <Tooltip contentStyle={chartTooltip} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Millets" stackId="a" fill="#5fcf80" />
            <Bar dataKey="Pulses" stackId="a" fill="#6aa9ff" />
            <Bar dataKey="Oilseeds" stackId="a" fill="#f0c560" />
            <Bar dataKey="Cotton" stackId="a" fill="#ff7e6a" />
            <Bar dataKey="Paddy" stackId="a" fill="#b07eff" />
            <Bar dataKey="Other" stackId="a" fill="#4bd6c8" />
          </BarChart>
        </ResponsiveContainer>
      </Section>
    </AppLayout>
  );
}
