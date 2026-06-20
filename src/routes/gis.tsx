import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Section, Badge } from "@/components/Kpi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useParcels, useGroundTruth, useSuitability, useYield, useSoil, useWeather, cropCategory } from "@/lib/data";
import { useEffect, useMemo, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";

export const Route = createFileRoute("/gis")({
  head: () => ({
    meta: [
      { title: "GIS Map Center — Precision Agriculture Andhra Pradesh | CropVision AI" },
      { name: "description", content: "Interactive parcel-level GIS map for Anantapur district, Andhra Pradesh. Crop classification, suitability mapping, and satellite-based soil estimations." },
      { name: "keywords", content: "precision agriculture Andhra Pradesh, satellite-based soil estimation, AI soil mapping, parcel-level soil health" }
    ]
  }),
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
  const yields = useYield().data ?? [];
  const soil = useSoil().data ?? [];
  const weather = useWeather().data ?? [];
  const [layer, setLayer] = useState<LayerKey>("crop");

  const [district, setDistrict] = useState<string>("All");
  const [mandal, setMandal] = useState<string>("All");
  const [village, setVillage] = useState<string>("All");
  
  const [hiddenCats, setHiddenCats] = useState<Set<string>>(new Set());
  useEffect(() => { setHiddenCats(new Set()); }, [layer]);

  const districts = useMemo(() => ["All", ...new Set(parcels.map((p: any) => p.district).filter(Boolean))], [parcels]);
  const mandals = useMemo(() => ["All", ...new Set(parcels.filter((p: any) => district === "All" || p.district === district).map((p: any) => p.mandal).filter(Boolean))], [parcels, district]);
  const villages = useMemo(() => ["All", ...new Set(parcels.filter((p: any) => (district === "All" || p.district === district) && (mandal === "All" || p.mandal === mandal)).map((p: any) => p.village).filter(Boolean))], [parcels, district, mandal]);

  const gMap = useMemo(() => new Map<string, any>(gt.filter((g: any) => g.season === "Kharif").map((g: any) => [g.parcel_id, g])), [gt]);
  const suitMap = useMemo(() => new Map<string, any>(suit.filter((s: any) => s.season === "Kharif").map((s: any) => [s.parcel_id, s])), [suit]);
  const yMap = useMemo(() => new Map<string, any>(yields.filter((y: any) => y.season === "Kharif").map((y: any) => [y.parcel_id, y])), [yields]);
  const soilMap = useMemo(() => new Map<string, any>(soil.filter((s: any) => s.season === "Kharif").map((s: any) => [s.parcel_id, s])), [soil]);
  const weatherMap = useMemo(() => new Map<string, any>(weather.filter((w: any) => w.season === "Kharif").map((w: any) => [w.parcel_id, w])), [weather]);

  const filteredParcels = useMemo(() => {
    return parcels.filter((p: any) => {
      if (district !== "All" && p.district !== district) return false;
      if (mandal !== "All" && p.mandal !== mandal) return false;
      if (village !== "All" && p.village !== village) return false;
      
      if (layer === "crop") {
        const g = gMap.get(p.parcel_id);
        const cat = g ? cropCategory(g.crop_type) : "Other";
        if (hiddenCats.has(cat)) return false;
      } else if (layer === "suitability") {
        const s = suitMap.get(p.parcel_id) as any;
        const sc = s?.suitability_score ?? 50;
        const cat = sc >= 80 ? "Highly Suitable" : sc >= 65 ? "Suitable" : sc >= 50 ? "Moderate" : "Unsuitable";
        if (hiddenCats.has(cat)) return false;
      } else {
        const s = suitMap.get(p.parcel_id) as any;
        const cat = s?.diversification_potential ?? "Other";
        if (hiddenCats.has(cat)) return false;
      }
      return true;
    });
  }, [parcels, district, mandal, village, layer, hiddenCats, gMap, suitMap]);

  const [selectedParcel, setSelectedParcel] = useState<any>(null);

  const toggleLegend = (k: string) => {
    setHiddenCats(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="GIS Map Center"
        subtitle="Interactive parcel map · Anantapur District"
        actions={
          <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border">
            {(["crop", "suitability", "expansion"] as const).map((l) => (
              <button key={l} onClick={() => setLayer(l)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${layer === l ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}>
                {l}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex gap-3 mb-4">
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

      <Section title="" className="!p-0 overflow-hidden relative z-0">
        <ClientOnly fallback={<div className="h-[600px] flex items-center justify-center text-muted-foreground">Loading map…</div>}>
          <MapView parcels={filteredParcels} layer={layer} gMap={gMap} suitMap={suitMap} onParcelClick={(p: any) => setSelectedParcel({ p, g: gMap.get(p.parcel_id), s: suitMap.get(p.parcel_id), y: yMap.get(p.parcel_id), soil: soilMap.get(p.parcel_id), weather: weatherMap.get(p.parcel_id) })} />
        </ClientOnly>
        
        <div className="absolute bottom-6 left-6 z-[400] bg-background/95 backdrop-blur-md p-4 rounded-xl border border-border shadow-xl min-w-[180px]">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Map Legend</h3>
          <div className="flex flex-col gap-2.5">
            {layer === "crop" && Object.entries(CROP_COLORS).map(([k, c]) => (
              <button key={k} onClick={() => toggleLegend(k)} className={`flex items-center gap-3 text-left transition-opacity ${hiddenCats.has(k) ? "opacity-30" : "opacity-100 hover:opacity-80"}`}>
                <span className="size-3.5 rounded-full shadow-sm" style={{ background: c }} />
                <span className="text-sm font-medium">{k}</span>
              </button>
            ))}
            {layer === "suitability" && [["Highly Suitable", "#3aa55a", "≥80"], ["Suitable", "#7dd87f", "65–80"], ["Moderate", "#f0c560", "50–65"], ["Unsuitable", "#e85a4f", "<50"]].map(([k, c, lbl]) => (
              <button key={k} onClick={() => toggleLegend(k)} className={`flex items-center gap-3 text-left transition-opacity ${hiddenCats.has(k) ? "opacity-30" : "opacity-100 hover:opacity-80"}`}>
                <span className="size-3.5 rounded-full shadow-sm" style={{ background: c }} />
                <span className="text-sm font-medium flex-1">{k}</span>
                <span className="text-xs text-muted-foreground font-mono">{lbl}</span>
              </button>
            ))}
            {layer === "expansion" && [["High", "#3aa55a"], ["Medium", "#f0c560"], ["Low", "#e85a4f"]].map(([k, c]) => (
              <button key={k} onClick={() => toggleLegend(k)} className={`flex items-center gap-3 text-left transition-opacity ${hiddenCats.has(k) ? "opacity-30" : "opacity-100 hover:opacity-80"}`}>
                <span className="size-3.5 rounded-full shadow-sm" style={{ background: c }} />
                <span className="text-sm font-medium">{k} Potential</span>
              </button>
            ))}
          </div>
        </div>

        {/* Parcel Details Sidebar */}
        {selectedParcel && (
          <div className="absolute top-0 right-0 h-full w-[380px] bg-background/95 backdrop-blur-xl border-l border-border shadow-2xl z-[500] flex flex-col transform transition-transform animate-in slide-in-from-right">
            <div className="flex items-center justify-between p-5 border-b border-border/50">
              <div>
                <h3 className="text-lg font-bold"><span className="text-xs font-normal text-muted-foreground uppercase tracking-wider mr-2">Parcel ID:</span>{selectedParcel.p.parcel_id}</h3>
                <div className="flex flex-col gap-0.5 mt-2 text-sm text-muted-foreground">
                  <div><span className="font-medium text-foreground">Farmer Name:</span> {selectedParcel.p.farmer_name}</div>
                  <div><span className="font-medium text-foreground">Village:</span> {selectedParcel.p.village}</div>
                  <div><span className="font-medium text-foreground">Mandal:</span> {selectedParcel.p.mandal}</div>
                </div>
              </div>
              <button onClick={() => setSelectedParcel(null)} className="p-2 rounded-full hover:bg-muted text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Parcel Info</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                    <p className="text-xs text-muted-foreground">Area</p>
                    <p className="font-semibold">{selectedParcel.p.parcel_area_acres?.toFixed(1)} Acres</p>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                    <p className="text-xs text-muted-foreground">Use Type</p>
                    <p className="font-semibold">{selectedParcel.p.land_use_type || "Agriculture"}</p>
                  </div>
                </div>
              </div>

              {layer === "crop" && selectedParcel.g && (
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Current Crop</h4>
                  <div className="bg-muted/30 p-4 rounded-lg border border-border/50 space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-medium text-primary">{selectedParcel.g.crop_type}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">Irrigation</p>
                      <p className="font-medium">{selectedParcel.g.irrigation_type || "Rainfed"}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">Est. Yield</p>
                      <p className="font-medium">{selectedParcel.y?.yield_kg_per_acre ? (selectedParcel.y.yield_kg_per_acre / 100).toFixed(1) : "—"} qtl/ac</p>
                    </div>
                  </div>
                </div>
              )}

              {layer === "suitability" && selectedParcel.s && (
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Suitability Analysis</h4>
                  <div className="bg-muted/30 p-4 rounded-lg border border-border/50 space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">Score</p>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${selectedParcel.s.suitability_score}%` }} />
                        </div>
                        <p className="font-medium">{selectedParcel.s.suitability_score?.toFixed(0)}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">Recommended</p>
                      <p className="font-medium text-emerald-500">{selectedParcel.s.recommended_crop}</p>
                    </div>
                  </div>
                </div>
              )}

              {layer === "expansion" && selectedParcel.s && (
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Expansion Potential</h4>
                  <div className="bg-muted/30 p-4 rounded-lg border border-border/50 space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">Recommended</p>
                      <p className="font-medium text-emerald-500">{selectedParcel.s.recommended_crop}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">Potential</p>
                      <Badge variant={selectedParcel.s.diversification_potential === "High" ? "success" : selectedParcel.s.diversification_potential === "Medium" ? "warning" : "danger"}>
                        {selectedParcel.s.diversification_potential}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Show additional detail components depending on the mode, or always show them if there's space */}
              {selectedParcel.soil && (
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Soil Health</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted/20 p-2 rounded border border-border/30">
                      <p className="text-[10px] text-muted-foreground uppercase">Texture</p>
                      <p className="font-medium truncate">{selectedParcel.soil.soil_texture}</p>
                    </div>
                    <div className="bg-muted/20 p-2 rounded border border-border/30">
                      <p className="text-[10px] text-muted-foreground uppercase">pH</p>
                      <p className="font-medium truncate">{selectedParcel.soil.pH}</p>
                    </div>
                    <div className="bg-muted/20 p-2 rounded border border-border/30">
                      <p className="text-[10px] text-muted-foreground uppercase">Organic C</p>
                      <p className="font-medium truncate">{selectedParcel.soil.organic_carbon}%</p>
                    </div>
                    <div className="bg-muted/20 p-2 rounded border border-border/30">
                      <p className="text-[10px] text-muted-foreground uppercase">N-P-K</p>
                      <p className="font-medium truncate">{selectedParcel.soil.nitrogen_kg_ha}-{selectedParcel.soil.phosphorus_kg_ha}-{selectedParcel.soil.potassium_kg_ha}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedParcel.weather && (
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Weather Profile</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted/20 p-2 rounded border border-border/30">
                      <p className="text-[10px] text-muted-foreground uppercase">Rainfall</p>
                      <p className="font-medium truncate">{selectedParcel.weather.total_rainfall_mm} mm</p>
                    </div>
                    <div className="bg-muted/20 p-2 rounded border border-border/30">
                      <p className="text-[10px] text-muted-foreground uppercase">Avg Temp</p>
                      <p className="font-medium truncate">{selectedParcel.weather.avg_temperature_c}°C</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </Section>
    </AppLayout>
  );
}

function MapView({ parcels, layer, gMap, suitMap, onParcelClick }: any) {
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
    const layerGroup = L.featureGroup().addTo(map);

    parcels.forEach((p: any) => {
      let color = "#888";
      let label = p.parcel_id;
      if (layer === "crop") {
        const g = gMap.get(p.parcel_id);
        const cat = g ? cropCategory(g.crop_type) : "Other";
        color = CROP_COLORS[cat] || "#888";
        label = `<b>${p.parcel_id}</b><br/>${g?.crop_type ?? "—"} · ${p.village}`;
      } else if (layer === "suitability") {
        const s = suitMap.get(p.parcel_id) as any;
        const sc = s?.suitability_score ?? 50;
        color = sc >= 80 ? "#3aa55a" : sc >= 65 ? "#7dd87f" : sc >= 50 ? "#f0c560" : "#e85a4f";
        label = `<b>${p.parcel_id}</b><br/>Score: ${sc?.toFixed(0)}`;
      } else {
        const s = suitMap.get(p.parcel_id) as any;
        color = s?.diversification_potential === "High" ? "#3aa55a" : s?.diversification_potential === "Medium" ? "#f0c560" : "#e85a4f";
        label = `<b>${p.parcel_id}</b><br/>Potential: ${s?.diversification_potential ?? "—"}`;
      }
      L.circleMarker([p.latitude, p.longitude], {
        radius: 4 + Math.sqrt(p.parcel_area_acres || 0) * 1.5,
        fillColor: color, color: "#ffffff", weight: 1.5, fillOpacity: 0.85,
      }).bindPopup(label).on("click", () => onParcelClick?.(p)).addTo(layerGroup);
    });

    if (parcels.length === 1) {
      map.setView([parcels[0].latitude, parcels[0].longitude], 13);
    } else if (parcels.length > 1) {
      map.fitBounds(layerGroup.getBounds(), { padding: [50, 50], maxZoom: 13 });
    }

    return () => { layerGroup.remove(); };
  }, [ready, parcels, layer, gMap, suitMap, onParcelClick]);

  return <div ref={ref} className="h-[600px] w-full rounded-xl shadow-inner" style={{ background: "#0a1410" }} />;
}
