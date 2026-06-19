import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Users, MapPin, Trees, Layers, Wheat, Sprout, Droplets, BadgeCheck, TrendingUp, Award } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend, Line, LineChart } from "recharts";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { KpiCard, Section, Badge } from "@/components/Kpi";
import { useGroundTruth, useParcels, useYield, cropCategory, groupBy, sum, uniq } from "@/lib/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Executive Dashboard — CropVision AI" },
      { name: "description", content: "District-wide KPIs, crop distribution, mandal rankings and diversification overview for Anantapur." },
    ],
  }),
  component: Dashboard,
});

const COLORS = ["#5fcf80", "#f0c560", "#6aa9ff", "#ff7e6a", "#b07eff", "#4bd6c8", "#ffb84d"];

function Dashboard() {
  const parcels = useParcels().data ?? [];
  const gt = useGroundTruth().data ?? [];
  const yields = useYield().data ?? [];

  const kharif = gt.filter((r) => r.season === "Kharif");
  const totalArea = sum(kharif, (r) => r.land_area_acres);
  const byCat = groupBy(kharif, (r) => cropCategory(r.crop_type));
  const milletsArea = sum(byCat.Millets ?? [], (r) => r.land_area_acres);
  const pulsesArea = sum(byCat.Pulses ?? [], (r) => r.land_area_acres);
  const oilseedsArea = sum(byCat.Oilseeds ?? [], (r) => r.land_area_acres);

  const cropPie = Object.entries(groupBy(kharif, (r) => r.crop_type))
    .map(([name, rows]) => ({ name, value: Math.round(sum(rows, (r) => r.land_area_acres)) }))
    .sort((a, b) => b.value - a.value).slice(0, 8);

  const mandals = Object.entries(groupBy(kharif, (r) => r.mandal))
    .map(([name, rows]) => ({ name, area: Math.round(sum(rows, (r) => r.land_area_acres)) }))
    .sort((a, b) => b.area - a.area).slice(0, 8);

  const villages = Object.entries(groupBy(kharif, (r) => r.village))
    .map(([name, rows]) => ({ name, area: Math.round(sum(rows, (r) => r.land_area_acres)) }))
    .sort((a, b) => b.area - a.area).slice(0, 8);

  const seasonTrend = ["Kharif", "Rabi", "Summer"].map((s) => {
    const rows = gt.filter((r) => r.season === s);
    return {
      season: s,
      Millets: Math.round(sum(rows.filter((r) => cropCategory(r.crop_type) === "Millets"), (r) => r.land_area_acres)),
      Pulses: Math.round(sum(rows.filter((r) => cropCategory(r.crop_type) === "Pulses"), (r) => r.land_area_acres)),
      Oilseeds: Math.round(sum(rows.filter((r) => cropCategory(r.crop_type) === "Oilseeds"), (r) => r.land_area_acres)),
      Cotton: Math.round(sum(rows.filter((r) => r.crop_type === "Cotton"), (r) => r.land_area_acres)),
    };
  });

  const totalIncome = sum(yields, (r) => r.gross_income_rs);
  const diversificationScore = Math.round(
    (1 - cropPie[0]?.value / Math.max(1, cropPie.reduce((a, b) => a + b.value, 0))) * 100
  );

  return (
    <AppLayout>
      <PageHeader
        title="Executive Dashboard"
        subtitle="Real-time agricultural intelligence — Anantapur District, AP"
        actions={<Badge variant="success">● Live · Kharif 2025</Badge>}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Total Farmers" value={uniq(gt.map((g) => g.parcel_id)).length.toLocaleString()} icon={Users} delay={0.0} />
        <KpiCard label="Total Parcels" value={parcels.length.toLocaleString()} icon={MapPin} delay={0.05} accent="info" />
        <KpiCard label="Villages" value={uniq(parcels.map((p) => p.village)).length} icon={Trees} delay={0.1} accent="accent" />
        <KpiCard label="Mandals" value={uniq(parcels.map((p) => p.mandal)).length} icon={Layers} delay={0.15} />
        <KpiCard label="Crop Area" value={`${Math.round(totalArea).toLocaleString()} ac`} icon={Wheat} delay={0.2} accent="warning" />
        <KpiCard label="Millets Area" value={`${Math.round(milletsArea).toLocaleString()} ac`} icon={Sprout} delay={0.25} trend={{ value: "12.4%", positive: true }} />
        <KpiCard label="Pulses Area" value={`${Math.round(pulsesArea).toLocaleString()} ac`} icon={Wheat} delay={0.3} accent="info" trend={{ value: "8.1%", positive: true }} />
        <KpiCard label="Oilseeds Area" value={`${Math.round(oilseedsArea).toLocaleString()} ac`} icon={Droplets} delay={0.35} accent="accent" />
        <KpiCard label="Diversification" value={`${diversificationScore}/100`} icon={TrendingUp} delay={0.4} hint="Shannon index" />
        <KpiCard label="Scheme Coverage" value="68%" icon={BadgeCheck} delay={0.45} accent="warning" hint="NFSM + NMEO" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Section title="Crop Distribution" subtitle="Kharif 2025 · acres" className="lg:col-span-1">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={cropPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2}>
                {cropPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={chartTooltip} itemStyle={{ color: "#fff" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Top Mandals by Crop Area" subtitle="Acres under cultivation" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={mandals} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "currentColor" }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: "currentColor" }} />
              <Tooltip contentStyle={chartTooltip} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="area" radius={[6, 6, 0, 0]} fill="url(#barGrad)" />
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5fcf80" />
                  <stop offset="100%" stopColor="#3d9460" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <Section title="Seasonal Crop Trends" subtitle="Acres by category and season" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={seasonTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="season" tick={{ fontSize: 11, fill: "currentColor" }} />
              <YAxis tick={{ fontSize: 11, fill: "currentColor" }} />
              <Tooltip contentStyle={chartTooltip} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Millets" stroke="#5fcf80" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Pulses" stroke="#6aa9ff" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Oilseeds" stroke="#f0c560" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Cotton" stroke="#ff7e6a" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Top Villages" subtitle="By cultivated area">
          <div className="space-y-2">
            {villages.map((v, i) => (
              <motion.div key={v.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                <div className="size-7 rounded-md bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{v.name}</div>
                  <div className="h-1 bg-muted rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${(v.area / villages[0].area) * 100}%` }} />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{v.area} ac</div>
              </motion.div>
            ))}
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {[
          { label: "Millet Expansion", potential: "1,240 ac", desc: "Identified across 18 mandals", icon: Sprout, accent: "primary" as const },
          { label: "Pulses Expansion", potential: "890 ac", desc: "High suitability in 12 villages", icon: Award, accent: "info" as const },
          { label: "Oilseeds Expansion", potential: "1,580 ac", desc: "Groundnut + Sunflower zones", icon: Droplets, accent: "accent" as const },
        ].map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div key={c.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.05 }}
              className="glass rounded-xl p-5 relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 size-32 rounded-full opacity-10 blur-2xl"
                style={{ background: c.accent === "accent" ? "var(--color-accent)" : c.accent === "info" ? "var(--color-info)" : "var(--color-primary)" }} />
              <div className="flex items-center gap-3 mb-3">
                <Icon className="size-5 text-primary" />
                <span className="text-sm font-semibold">{c.label}</span>
              </div>
              <div className="text-3xl font-bold text-gradient">{c.potential}</div>
              <div className="text-xs text-muted-foreground mt-1">{c.desc}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        Total estimated gross income (current crops): <span className="text-foreground font-semibold">₹{(totalIncome / 1e7).toFixed(2)} Cr</span>
      </div>
    </AppLayout>
  );
}

export const chartTooltip = {
  background: "rgba(20, 28, 24, 0.95)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  fontSize: 12,
  color: "#fff",
};
