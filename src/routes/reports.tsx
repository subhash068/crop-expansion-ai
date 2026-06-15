import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Section, Badge } from "@/components/Kpi";
import { useGroundTruth, groupBy, sum, uniq } from "@/lib/data";
import { FileText, Download, FileSpreadsheet, FileBarChart } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — CropVision AI" }] }),
  component: Reports,
});

function downloadCSV(filename: string, rows: any[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function Reports() {
  const gt = useGroundTruth().data ?? [];
  const [level, setLevel] = useState<"District" | "Mandal" | "Village">("Mandal");

  const data = useMemo(() => {
    const kharif = gt.filter((g) => g.season === "Kharif");
    if (level === "District") {
      return [{ region: "Anantapur", parcels: kharif.length, area: sum(kharif, (r) => r.land_area_acres).toFixed(0), crops: uniq(kharif.map((r) => r.crop_type)).length }];
    }
    const k = level === "Mandal" ? "mandal" : "village";
    return Object.entries(groupBy(kharif, (r) => (r as any)[k])).map(([region, list]) => ({
      region, parcels: list.length, area: sum(list, (r) => r.land_area_acres).toFixed(0), crops: uniq(list.map((r) => r.crop_type)).length,
    })).sort((a, b) => +b.area - +a.area);
  }, [gt, level]);

  return (
    <AppLayout>
      <PageHeader
        title="Reports"
        subtitle="One-click exports for district, mandal & village summaries"
        actions={
          <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border">
            {(["District", "Mandal", "Village"] as const).map((l) => (
              <button key={l} onClick={() => setLevel(l)}
                className={`px-3 py-1 text-xs rounded-md ${level === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{l}</button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { title: "Executive Summary", icon: FileText, format: "PDF", desc: "District KPIs and headline metrics" },
          { title: "Crop Distribution Sheet", icon: FileSpreadsheet, format: "XLSX", desc: "Full village/mandal crop area data" },
          { title: "Diversification Report", icon: FileBarChart, format: "PDF", desc: "Recommended interventions per parcel" },
        ].map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.title} className="glass rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="size-10 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
                  <Icon className="size-5 text-primary-foreground" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{r.title}</div>
                  <Badge variant="info">{r.format}</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{r.desc}</p>
              <button onClick={() => downloadCSV(`${r.title.replace(/\s/g, "_")}.csv`, data)}
                className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center gap-1.5 hover:opacity-90">
                <Download className="size-3.5" /> Download
              </button>
            </div>
          );
        })}
      </div>

      <Section title={`${level} Report Preview`} className="mt-6">
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px]">
              <tr>{["Region", "Parcels", "Crop Area (ac)", "Crop Diversity"].map(h => <th key={h} className="text-left p-2.5">{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.slice(0, 60).map((r) => (
                <tr key={r.region} className="border-t border-border hover:bg-muted/20">
                  <td className="p-2.5 font-medium">{r.region}</td>
                  <td className="p-2.5">{r.parcels}</td>
                  <td className="p-2.5">{r.area}</td>
                  <td className="p-2.5">{r.crops} crops</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </AppLayout>
  );
}
