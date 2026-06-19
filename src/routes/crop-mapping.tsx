import { createFileRoute } from "@tanstack/react-router";
import { Satellite, Target, CheckCircle2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { KpiCard, Section, Badge } from "@/components/Kpi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGroundTruth, useSatellite, groupBy, sum } from "@/lib/data";
import { chartTooltip } from "./index";
import { useMemo, useState, useEffect } from "react";

export const Route = createFileRoute("/crop-mapping")({
  head: () => ({
    meta: [
      { title: "Crop Mapping Center — Satellite Crop Classification AP | CropVision AI" },
      { name: "description", content: "AI parcel-level crop classification in Andhra Pradesh using Planet 3m and Sentinel-2 satellite imagery. Validated against e-Panta ground-truth surveys." },
      { name: "keywords", content: "AI soil mapping, satellite-based soil estimation, precision agriculture Andhra Pradesh, parcel-level crop mapping" }
    ]
  }),
  component: CropMapping,
});

function confidence(ndvi: number, cloud: number) {
  if (cloud > 15) return { level: "Low", score: 60 + Math.round(ndvi * 20) };
  if (ndvi > 0.6) return { level: "High", score: 88 + Math.round(ndvi * 8) };
  if (ndvi > 0.4) return { level: "Medium", score: 75 + Math.round(ndvi * 15) };
  return { level: "Low", score: 60 + Math.round(ndvi * 25) };
}

function CropMapping() {
  const gt = useGroundTruth().data ?? [];
  const sat = useSatellite().data ?? [];
  const [season, setSeason] = useState("Kharif");

  const [district, setDistrict] = useState<string>("All");
  const [mandal, setMandal] = useState<string>("All");
  const [village, setVillage] = useState<string>("All");

  const districts = useMemo(() => ["All", ...new Set(gt.map((p: any) => p.district).filter(Boolean))], [gt]);
  const mandals = useMemo(() => ["All", ...new Set(gt.filter((p: any) => district === "All" || p.district === district).map((p: any) => p.mandal).filter(Boolean))], [gt, district]);
  const villages = useMemo(() => ["All", ...new Set(gt.filter((p: any) => (district === "All" || p.district === district) && (mandal === "All" || p.mandal === mandal)).map((p: any) => p.village).filter(Boolean))], [gt, district, mandal]);

  const rows = useMemo(() => {
    const satMap = new Map(sat.filter((s) => s.season === season).map((s) => [s.parcel_id, s]));
    return gt.filter((g) => {
      if (g.season !== season) return false;
      if (district !== "All" && g.district !== district) return false;
      if (mandal !== "All" && g.mandal !== mandal) return false;
      if (village !== "All" && g.village !== village) return false;
      return true;
    }).map((g) => {
      const s = satMap.get(g.parcel_id);
      const conf = confidence(s?.NDVI ?? 0.5, s?.cloud_cover_percent ?? 5);
      return { ...g, ndvi: s?.NDVI ?? 0, cloud: s?.cloud_cover_percent ?? 0, confidence: conf };
    });
  }, [gt, sat, season, district, mandal, village]);

  const stats = useMemo(() => {
    const high = rows.filter((r) => r.confidence.level === "High").length;
    const med = rows.filter((r) => r.confidence.level === "Medium").length;
    const low = rows.filter((r) => r.confidence.level === "Low").length;
    const avg = rows.length ? Math.round(rows.reduce((a, r) => a + r.confidence.score, 0) / rows.length) : 0;
    return { high, med, low, avg };
  }, [rows]);

  const cropAreaStats = Object.entries(groupBy(rows, (r) => r.crop_type))
    .map(([name, list]) => ({ name, area: Math.round(sum(list, (r) => r.land_area_acres)), count: list.length }))
    .sort((a, b) => b.area - a.area).slice(0, 12);

  const [page, setPage] = useState(1);
  const pageSize = 50;
  const totalPages = Math.ceil(rows.length / pageSize);
  const paginatedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [district, mandal, village, season]);

  return (
    <AppLayout>
      <PageHeader
        title="Crop Mapping Center"
        subtitle="AI parcel-level crop classification using Planet 3m & Sentinel-2 imagery"
        actions={
          <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border">
            {["Kharif", "Rabi", "Summer"].map((s) => (
              <button key={s} onClick={() => setSeason(s)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${season === s ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}>
                {s}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex gap-3 mb-6">
        <Select value={district} onValueChange={(v) => { setDistrict(v); setMandal("All"); setVillage("All"); }}>
          <SelectTrigger className="h-9 px-3 bg-muted/50 border-border text-sm flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {districts.map((d: any) => <SelectItem key={d} value={d}>{d === "All" ? "All Districts" : d}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={mandal} onValueChange={(v) => { setMandal(v); setVillage("All"); }}>
          <SelectTrigger className="h-9 px-3 bg-muted/50 border-border text-sm flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {mandals.map((m: any) => <SelectItem key={m} value={m}>{m === "All" ? "All Mandals" : m}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={village} onValueChange={(v) => setVillage(v)}>
          <SelectTrigger className="h-9 px-3 bg-muted/50 border-border text-sm flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {villages.map((v: any) => <SelectItem key={v} value={v}>{v === "All" ? "All Villages" : v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Classified Parcels" value={rows.length.toLocaleString()} icon={Satellite} />
        <KpiCard label="Avg Confidence" value={`${stats.avg}%`} icon={Target} accent="info" />
        <KpiCard label="Model Accuracy" value="89.2%" icon={CheckCircle2} accent="accent" hint=">85% target met vs e-Panta" />
        <KpiCard label="Image Source" value="Planet + Sentinel" hint="Planet 3m weekly" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Section title="Confidence Breakdown" className="lg:col-span-1">
          <div className="space-y-3">
            {[
              { label: "High Confidence", n: stats.high, color: "var(--color-success)" },
              { label: "Medium Confidence", n: stats.med, color: "var(--color-warning)" },
              { label: "Low Confidence", n: stats.low, color: "var(--color-destructive)" },
            ].map((c) => (
              <div key={c.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span>{c.label}</span>
                  <span className="font-semibold">{c.n}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full" style={{ width: `${(c.n / rows.length) * 100}%`, background: c.color }} />
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Crop Area Statistics" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={cropAreaStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "currentColor" }} angle={-30} textAnchor="end" height={60} interval={0} />
              <YAxis tick={{ fontSize: 11, fill: "currentColor" }} />
              <Tooltip contentStyle={chartTooltip} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="area" fill="#5fcf80" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      <Section title="Parcel Classification Results" subtitle={rows.length > 0 ? `Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, rows.length)} of ${rows.length} parcels` : "No parcels found"} className="mt-4">
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px]">
              <tr>
                {["Parcel ID", "Village", "Mandal", "Crop", "Stage", "NDVI", "Cloud %", "Confidence"].map((h) => (
                  <th key={h} className="text-left p-2.5 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((r) => (
                <tr key={r.parcel_id} className="border-t border-border hover:bg-muted/20">
                  <td className="p-2.5 font-mono">{r.parcel_id}</td>
                  <td className="p-2.5">{r.village}</td>
                  <td className="p-2.5">{r.mandal}</td>
                  <td className="p-2.5 font-medium">{r.crop_type}</td>
                  <td className="p-2.5 text-muted-foreground">{r.crop_stage}</td>
                  <td className="p-2.5">{r.ndvi?.toFixed(2)}</td>
                  <td className="p-2.5">{r.cloud?.toFixed(1)}</td>
                  <td className="p-2.5">
                    <Badge variant={r.confidence.level === "High" ? "success" : r.confidence.level === "Medium" ? "warning" : "danger"}>
                      {r.confidence.level} · {r.confidence.score}%
                    </Badge>
                  </td>
                </tr>
              ))}
              {paginatedRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-muted-foreground">No data available for the selected filters.</td>
                </tr>
              )}
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
                className="px-3 py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                Previous
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
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
