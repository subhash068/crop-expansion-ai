import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, ComposedChart } from "recharts";
import { CloudRain, Thermometer, Droplets, Wind } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { KpiCard, Section, Badge } from "@/components/Kpi";
import { useWeather, groupBy } from "@/lib/data";
import { chartTooltip } from "./index";
import { useMemo } from "react";

export const Route = createFileRoute("/weather")({
  head: () => ({ meta: [{ title: "Weather Intelligence — CropVision AI" }] }),
  component: Weather,
});

function Weather() {
  const w = useWeather().data ?? [];

  const avg = (rows: typeof w, k: keyof typeof w[number]) => rows.length ? rows.reduce((a, r) => a + (r[k] as number), 0) / rows.length : 0;

  const seasonal = useMemo(() => ["Kharif", "Rabi", "Summer"].map((s) => {
    const rows = w.filter((r) => r.season === s);
    return {
      season: s,
      rainfall: Math.round(avg(rows, "total_rainfall_mm")),
      temp: +avg(rows, "avg_temperature_c").toFixed(1),
      humidity: Math.round(avg(rows, "avg_humidity_percent")),
      et: Math.round(avg(rows, "evapotranspiration_mm")),
    };
  }), [w]);

  const droughtBreak = useMemo(() => {
    const byRisk = groupBy(w.filter((x) => x.season === "Kharif"), (r) => r.drought_risk);
    return [
      { risk: "Low", count: byRisk.Low?.length ?? 0 },
      { risk: "Medium", count: byRisk.Medium?.length ?? 0 },
      { risk: "High", count: byRisk.High?.length ?? 0 },
    ];
  }, [w]);

  // simulate 30-day forecast from Kharif averages
  const forecast = Array.from({ length: 14 }).map((_, i) => ({
    day: `D${i + 1}`,
    rainfall: Math.round(15 + Math.random() * 35),
    temp: +(28 + Math.sin(i * 0.5) * 4 + Math.random() * 2).toFixed(1),
  }));

  const kharif = w.filter((r) => r.season === "Kharif");

  return (
    <AppLayout>
      <PageHeader title="Weather Intelligence" subtitle="APSDPS + IMD data · Kharif 2025 averages" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Avg Rainfall" value={`${Math.round(avg(kharif, "total_rainfall_mm"))} mm`} icon={CloudRain} />
        <KpiCard label="Avg Temperature" value={`${avg(kharif, "avg_temperature_c").toFixed(1)} °C`} icon={Thermometer} accent="warning" />
        <KpiCard label="Avg Humidity" value={`${Math.round(avg(kharif, "avg_humidity_percent"))}%`} icon={Droplets} accent="info" />
        <KpiCard label="Avg Wind" value={`${avg(kharif, "avg_wind_speed_kmph").toFixed(1)} km/h`} icon={Wind} accent="accent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Section title="Seasonal Rainfall" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={seasonal}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="season" tick={{ fontSize: 11, fill: "currentColor" }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "currentColor" }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "currentColor" }} />
              <Tooltip contentStyle={chartTooltip} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="rainfall" fill="#6aa9ff" name="Rainfall (mm)" radius={[6, 6, 0, 0]} />
              <Line yAxisId="right" dataKey="temp" stroke="#f0c560" strokeWidth={2.5} name="Avg Temp (°C)" />
            </ComposedChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Drought Risk Distribution">
          <div className="space-y-3 pt-4">
            {droughtBreak.map((d) => (
              <div key={d.risk}>
                <div className="flex justify-between text-xs mb-1.5">
                  <Badge variant={d.risk === "Low" ? "success" : d.risk === "Medium" ? "warning" : "danger"}>{d.risk}</Badge>
                  <span className="font-semibold">{d.count} parcels</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full" style={{
                    width: `${(d.count / w.filter(x => x.season === "Kharif").length) * 100}%`,
                    background: d.risk === "Low" ? "var(--color-success)" : d.risk === "Medium" ? "var(--color-warning)" : "var(--color-destructive)"
                  }} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section title="14-Day Rainfall & Temperature Forecast" className="mt-4">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={forecast}>
            <defs>
              <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6aa9ff" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#6aa9ff" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "currentColor" }} />
            <YAxis tick={{ fontSize: 11, fill: "currentColor" }} />
            <Tooltip contentStyle={chartTooltip} />
            <Area type="monotone" dataKey="rainfall" stroke="#6aa9ff" fill="url(#rGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Section>
    </AppLayout>
  );
}
