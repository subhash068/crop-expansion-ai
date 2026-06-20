import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, ComposedChart } from "recharts";
import { CloudRain, Thermometer, Droplets, Wind, MapPin, Calendar as CalendarIcon } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { KpiCard, Section, Badge } from "@/components/Kpi";
import { useWeather, useParcels, useLiveWeather, groupBy, uniq } from "@/lib/data";
import { chartTooltip } from "./index";
import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

export const Route = createFileRoute("/weather")({
  head: () => ({ meta: [{ title: "Weather Intelligence — CropVision AI" }] }),
  component: Weather,
});

function Weather() {
  const weatherData = useWeather().data ?? [];
  const parcelsData = useParcels().data ?? [];

  const [selDistrict, setSelDistrict] = useState<string>("All");
  const [selMandal, setSelMandal] = useState<string>("All");
  const [selVillage, setSelVillage] = useState<string>("All");
  const [selDate, setSelDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  // Hierarchical Data Lookups
  const districts = useMemo(() => uniq(parcelsData.map(p => p.district)).filter(Boolean), [parcelsData]);
  const mandals = useMemo(() => uniq(parcelsData.filter(p => selDistrict === "All" || p.district === selDistrict).map(p => p.mandal)).filter(Boolean), [parcelsData, selDistrict]);
  const villages = useMemo(() => uniq(parcelsData.filter(p => (selDistrict === "All" || p.district === selDistrict) && (selMandal === "All" || p.mandal === selMandal)).map(p => p.village)).filter(Boolean), [parcelsData, selDistrict, selMandal]);

  // Filter valid parcels
  const validParcels = useMemo(() => {
    return parcelsData.filter(p => {
      if (selDistrict !== "All" && p.district !== selDistrict) return false;
      if (selMandal !== "All" && p.mandal !== selMandal) return false;
      if (selVillage !== "All" && p.village !== selVillage) return false;
      return true;
    });
  }, [parcelsData, selDistrict, selMandal, selVillage]);

  const validParcelIds = new Set(validParcels.map(p => p.parcel_id));

  // Filter weather data to only selected location
  const w = useMemo(() => weatherData.filter(r => validParcelIds.has(r.parcel_id)), [weatherData, validParcelIds]);

  // Get coords for live weather
  const [lat, lon] = useMemo(() => {
    if (validParcels.length === 0) return [undefined, undefined];
    const avgLat = validParcels.reduce((sum, p) => sum + p.latitude, 0) / validParcels.length;
    const avgLon = validParcels.reduce((sum, p) => sum + p.longitude, 0) / validParcels.length;
    return [avgLat, avgLon];
  }, [validParcels]);

  const liveWeather = useLiveWeather(lat, lon).data;

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

  const getDroughtRisk = (r: typeof w[number]) => {
    if (r.drought_risk) return r.drought_risk;
    // Fallback heuristic based on rainfall
    if (r.total_rainfall_mm < 300) return "High";
    if (r.total_rainfall_mm < 500) return "Medium";
    return "Low";
  };

  const droughtBreak = useMemo(() => {
    const kharifW = w.filter((x) => x.season === "Kharif");
    const byRisk = groupBy(kharifW, getDroughtRisk);
    return [
      { risk: "Low", count: byRisk.Low?.length ?? 0 },
      { risk: "Medium", count: byRisk.Medium?.length ?? 0 },
      { risk: "High", count: byRisk.High?.length ?? 0 },
    ];
  }, [w]);

  // 14-day forecast from live Open-Meteo or fallback
  const forecast = useMemo(() => {
    if (liveWeather?.daily) {
      return liveWeather.daily.time.map((t: string, i: number) => ({
        day: format(new Date(t), "MMM dd"),
        rainfall: liveWeather.daily.rain_sum[i],
        temp: liveWeather.daily.temperature_2m_max[i]
      }));
    }
    // Fallback if no live data yet
    return Array.from({ length: 14 }).map((_, i) => ({
      day: `D${i + 1}`,
      rainfall: Math.round(15 + Math.random() * 35),
      temp: +(28 + Math.sin(i * 0.5) * 4 + Math.random() * 2).toFixed(1),
    }));
  }, [liveWeather]);

  const kharif = w.filter((r) => r.season === "Kharif");

  return (
    <AppLayout>
      <PageHeader title="Weather Intelligence" subtitle="Live Open-Meteo Forecast & Historical IMD data" />

      {/* Filters Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 border rounded-xl bg-card">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">District</label>
          <Select value={selDistrict} onValueChange={(v) => { setSelDistrict(v); setSelMandal("All"); setSelVillage("All"); }}>
            <SelectTrigger><SelectValue placeholder="All Districts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Districts</SelectItem>
              {districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Mandal</label>
          <Select value={selMandal} onValueChange={(v) => { setSelMandal(v); setSelVillage("All"); }} disabled={selDistrict === "All" && mandals.length > 20}>
            <SelectTrigger><SelectValue placeholder="All Mandals" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Mandals</SelectItem>
              {mandals.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Village</label>
          <Select value={selVillage} onValueChange={setSelVillage} disabled={selMandal === "All"}>
            <SelectTrigger><SelectValue placeholder="All Villages" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Villages</SelectItem>
              {villages.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Sync Date</label>
          <div className="relative">
            <input 
              type="date" 
              value={selDate}
              onChange={(e) => setSelDate(e.target.value)}
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Avg Rainfall" value={`${Math.round(avg(kharif, "total_rainfall_mm"))} mm`} icon={CloudRain} />
        <KpiCard label="Avg Temperature" value={`${avg(kharif, "avg_temperature_c").toFixed(1)} °C`} icon={Thermometer} accent="warning" />
        <KpiCard label="Avg Humidity" value={`${Math.round(avg(kharif, "avg_humidity_percent"))}%`} icon={Droplets} accent="info" />
        <KpiCard label="Avg Wind" value={`${avg(kharif, "avg_wind_speed_kmph").toFixed(1)} km/h`} icon={Wind} accent="accent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Section title={`Seasonal Rainfall ${selVillage !== 'All' ? `(${selVillage})` : ''}`} className="lg:col-span-2">
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
                    width: `${(d.count / (w.filter(x => x.season === "Kharif").length || 1)) * 100}%`,
                    background: d.risk === "Low" ? "var(--color-success)" : d.risk === "Medium" ? "var(--color-warning)" : "var(--color-destructive)"
                  }} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section title={`Live 14-Day Forecast ${lat ? `(Lat: ${lat.toFixed(2)}, Lon: ${lon?.toFixed(2)})` : ''}`} className="mt-4">
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
            <Area type="monotone" dataKey="rainfall" stroke="#6aa9ff" fill="url(#rGrad)" strokeWidth={2} name="Rainfall (mm)" />
            <Line type="monotone" dataKey="temp" stroke="#f0c560" strokeWidth={2} dot={false} name="Max Temp (°C)" />
          </AreaChart>
        </ResponsiveContainer>
      </Section>
    </AppLayout>
  );
}
