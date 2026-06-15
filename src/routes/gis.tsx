import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Section, Badge } from "@/components/Kpi";
import { useParcels, useGroundTruth, useSuitability, cropCategory } from "@/lib/data";
import { useEffect, useMemo, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";

export const Route = createFileRoute("/gis")({
  head: () => ({ meta: [{ title: "GIS Map Center — CropVision AI" }] }),
  component: GIS,
});

type LayerKey = "crop" | "suitability" | "expansion";

const CROP_COLORS: Record<string, string> = {
  Millets: "#5fcf80", Pulses: "#6aa9ff", Oilseeds: "#f0c560",
  Cotton: "#ff7e6a", Paddy: "#b07eff", Other: "#888",
};

function GIS() {
  const parcels = useParcels().data ?? [];
  const gt = useGroundTruth().data ?? [];
  const suit = useSuitability().data ?? [];
  const [layer, setLayer] = useState<LayerKey>("crop");

  return (
    <AppLayout>
      <PageHeader
        title="GIS Map Center"
        subtitle="Interactive parcel map · Anantapur District"
        actions={
          <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border">
            {(["crop", "suitability", "expansion"] as const).map((l) => (
              <button key={l} onClick={() => setLayer(l)}
                className={`px-3 py-1 text-xs rounded-md capitalize ${layer === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {l}
              </button>
            ))}
          </div>
        }
      />
      <Section title="" className="!p-0 overflow-hidden">
        <ClientOnly fallback={<div className="h-[600px] flex items-center justify-center text-muted-foreground">Loading map…</div>}>
          <MapView parcels={parcels} gt={gt} suit={suit} layer={layer} />
        </ClientOnly>
      </Section>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
        {layer === "crop" && Object.entries(CROP_COLORS).map(([k, c]) => (
          <div key={k} className="glass rounded-lg p-3 flex items-center gap-2">
            <span className="size-3 rounded-sm" style={{ background: c }} />
            <span className="text-xs">{k}</span>
          </div>
        ))}
        {layer === "suitability" && [["≥80 Highly Suitable", "#3aa55a"], ["65–80 Suitable", "#7dd87f"], ["50–65 Moderate", "#f0c560"], ["<50 Unsuitable", "#e85a4f"]].map(([l, c]) => (
          <div key={l} className="glass rounded-lg p-3 flex items-center gap-2">
            <span className="size-3 rounded-sm" style={{ background: c }} />
            <span className="text-xs">{l}</span>
          </div>
        ))}
        {layer === "expansion" && [["High Potential", "#3aa55a"], ["Medium", "#f0c560"], ["Low", "#e85a4f"]].map(([l, c]) => (
          <div key={l} className="glass rounded-lg p-3 flex items-center gap-2">
            <span className="size-3 rounded-sm" style={{ background: c }} />
            <span className="text-xs">{l}</span>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}

function MapView({ parcels, gt, suit, layer }: any) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let map: any;
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, { center: [14.5, 77.7], zoom: 9, scrollWheelZoom: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap", maxZoom: 18,
      }).addTo(map);
      (map as any)._cropviz = { L };
      (ref.current as any)._map = map;
      setReady(true);
    })();
    return () => { cancelled = true; map?.remove(); };
  }, []);

  useEffect(() => {
    if (!ready || !ref.current) return;
    const map = (ref.current as any)._map;
    const L = (map as any)._cropviz.L;
    const layerGroup = L.layerGroup().addTo(map);

    const gtKharif = gt.filter((g: any) => g.season === "Kharif");
    const gMap = new Map(gtKharif.map((g: any) => [g.parcel_id, g]));
    const suitMap = new Map(suit.filter((s: any) => s.season === "Kharif").map((s: any) => [s.parcel_id, s]));

    parcels.forEach((p: any) => {
      let color = "#888";
      let label = p.parcel_id;
      if (layer === "crop") {
        const g = gMap.get(p.parcel_id);
        const cat = g ? cropCategory(g.crop_type) : "Other";
        color = CROP_COLORS[cat] || "#888";
        label = `${p.parcel_id}<br/>${g?.crop_type ?? "—"} · ${p.village}`;
      } else if (layer === "suitability") {
        const s = suitMap.get(p.parcel_id) as any;
        const sc = s?.suitability_score ?? 50;
        color = sc >= 80 ? "#3aa55a" : sc >= 65 ? "#7dd87f" : sc >= 50 ? "#f0c560" : "#e85a4f";
        label = `${p.parcel_id}<br/>Score: ${sc?.toFixed(0)}`;
      } else {
        const s = suitMap.get(p.parcel_id) as any;
        color = s?.diversification_potential === "High" ? "#3aa55a" : s?.diversification_potential === "Medium" ? "#f0c560" : "#e85a4f";
        label = `${p.parcel_id}<br/>Potential: ${s?.diversification_potential ?? "—"}`;
      }
      L.circleMarker([p.latitude, p.longitude], {
        radius: 4 + Math.sqrt(p.parcel_area_acres) * 1.5,
        fillColor: color, color: "#fff", weight: 0.8, fillOpacity: 0.75,
      }).bindPopup(label).addTo(layerGroup);
    });

    return () => { layerGroup.remove(); };
  }, [ready, parcels, gt, suit, layer]);

  return <div ref={ref} className="h-[600px] w-full" style={{ background: "#0a1410" }} />;
}
