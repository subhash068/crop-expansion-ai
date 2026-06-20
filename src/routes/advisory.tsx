import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Section, Badge } from "@/components/Kpi";
import { useSuitability, useGroundTruth, useWeather, useSoil, cropCategory } from "@/lib/data";
import { Languages, Sprout, Droplets, AlertTriangle, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/advisory")({
  head: () => ({
    meta: [
      { title: "Advisory Center — Fertilizer & Crop Advisories AP | CropVision AI" },
      { name: "description", content: "AI crop diversification and fertilizer advisories for farmers in Andhra Pradesh. Synced with Rythu Bharosa Kendras (RSK) for SMS and mobile alerts." },
      { name: "keywords", content: "fertilizer advisory system, parcel-level soil health, precision agriculture Andhra Pradesh, crop diversification AP" }
    ]
  }),
  component: Advisory,
});

const ADVISORY_TEMPLATES = {
  en: {
    millet_expand: (crop: string, name: string, ph: number, rain: number) => `Dear ${name}, with a soil pH of ${ph.toFixed(1)} and ${rain.toFixed(0)}mm seasonal rainfall, Millet (${crop}) cultivation is highly recommended to improve yields in rainfed conditions.`,
    oilseed: (crop: string, name: string, zinc: number, temp: number) => `Dear ${name}, your parcel has optimal Zinc levels (${zinc.toFixed(1)} ppm) and average temps of ${temp.toFixed(1)}°C, making it highly suitable for ${crop} expansion.`,
    pulses: (crop: string, name: string, nitrogen: number) => `Dear ${name}, your soil nitrogen is currently low (${nitrogen.toFixed(0)} kg/ha). Planting ${crop} will naturally fix nitrogen and provide better market returns.`,
    drought: (name: string, rain: number) => `Dear ${name}, severe drought risk detected with only ${rain.toFixed(0)}mm expected rainfall. Switch to short-duration drought-tolerant varieties immediately to minimize loss.`,
    rainfed: (name: string, temp: number, carbon: number) => `Dear ${name}, rainfed cultivation advised due to ${temp.toFixed(1)}°C avg temps. Your organic carbon is ${carbon.toFixed(1)}%. Avoid water-intensive crops.`,
  },
  te: {
    millet_expand: (crop: string, name: string, ph: number, rain: number) => `ప్రియమైన ${name}, ${ph.toFixed(1)} మట్టి pH మరియు ${rain.toFixed(0)}mm వర్షపాతంతో, వర్షాధార పరిస్థితులలో దిగుబడిని పెంచడానికి మిల్లెట్ (${crop}) సాగు సిఫార్సు చేయబడింది.`,
    oilseed: (crop: string, name: string, zinc: number, temp: number) => `ప్రియమైన ${name}, మీ భూమిలో జింక్ స్థాయిలు (${zinc.toFixed(1)} ppm) మరియు సగటు ఉష్ణోగ్రత ${temp.toFixed(1)}°C ఉండటం వలన, ఇది ${crop} సాగుకు అత్యంత అనుకూలం.`,
    pulses: (crop: string, name: string, nitrogen: number) => `ప్రియమైన ${name}, మీ మట్టిలో నత్రజని తక్కువగా ఉంది (${nitrogen.toFixed(0)} kg/ha). ${crop} నాటడం ద్వారా నత్రజని సహజంగా పెరుగుతుంది మరియు మంచి లాభాలు వస్తాయి.`,
    drought: (name: string, rain: number) => `ప్రియమైన ${name}, కేవలం ${rain.toFixed(0)}mm వర్షపాతం అంచనాతో తీవ్రమైన కరువు ప్రమాదం. నష్టాన్ని తగ్గించడానికి తక్కువ కాల వ్యవధి గల కరువును తట్టుకునే రకాలకు మారండి.`,
    rainfed: (name: string, temp: number, carbon: number) => `ప్రియమైన ${name}, ${temp.toFixed(1)}°C సగటు ఉష్ణోగ్రత మరియు సేంద్రియ కర్బనం ${carbon.toFixed(1)}% ఉండటం వలన, వర్షాధార సాగు సలహా ఇవ్వబడుతుంది.`,
  },
};

function Advisory() {
  const suit = useSuitability().data ?? [];
  const gt = useGroundTruth().data ?? [];
  const w = useWeather().data ?? [];
  const s = useSoil().data ?? [];
  const [lang, setLang] = useState<"en" | "te">("en");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcasted, setBroadcasted] = useState(false);

  const advisories = useMemo(() => {
    const gMap = new Map(gt.filter((g) => g.season === "Kharif").map((g) => [g.parcel_id, g]));
    const wMap = new Map(w.filter((x) => x.season === "Kharif").map((x) => [x.parcel_id, x]));
    const sMap = new Map(s.filter((x) => x.season === "Kharif").map((x) => [x.parcel_id, x]));
    
    const seenFarmers = new Set<string>();
    
    return suit.filter((st) => st.season === "Kharif").map((st) => {
      const g = gMap.get(st.parcel_id);
      const we = wMap.get(st.parcel_id);
      const so = sMap.get(st.parcel_id);
      const cat = cropCategory(st.recommended_crop);
      const t = ADVISORY_TEMPLATES[lang];
      
      const fname = g?.farmer_name || "Farmer";
      let msg = "";
      let type: "millet" | "oilseed" | "pulse" | "drought" | "rainfed" = "millet";
      
      if (we?.drought_risk === "High") { msg = t.drought(fname, we?.total_rainfall_mm || 0); type = "drought"; }
      else if (cat === "Millets") { msg = t.millet_expand(st.recommended_crop, fname, so?.pH || 7, we?.total_rainfall_mm || 0); type = "millet"; }
      else if (cat === "Oilseeds") { msg = t.oilseed(st.recommended_crop, fname, so?.zinc_ppm || 0, we?.avg_temperature_c || 0); type = "oilseed"; }
      else if (cat === "Pulses") { msg = t.pulses(st.recommended_crop, fname, so?.nitrogen_kg_ha || 0); type = "pulse"; }
      else { msg = t.rainfed(fname, we?.avg_temperature_c || 0, so?.organic_carbon || 0); type = "rainfed"; }
      
      return { 
        parcel_id: st.parcel_id, 
        farmer_name: fname,
        village: g?.village || "Unknown", 
        mandal: g?.mandal || "Unknown", 
        msg, 
        type, 
        score: st.suitability_score 
      };
    }).filter(a => {
      if (seenFarmers.has(a.farmer_name) && a.farmer_name !== "Farmer") return false;
      seenFarmers.add(a.farmer_name);
      return true;
    }).sort((a, b) => b.score - a.score);
  }, [suit, gt, w, s, lang]);

  return (
    <AppLayout>
      <PageHeader
        title="Advisory Center"
        subtitle="AI-generated, personalized advisories for farmers, RSKs & officers"
        actions={
          <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border">
            <button onClick={() => setLang("en")} className={`px-3 py-1 text-xs rounded-md flex items-center gap-1.5 ${lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              <Languages className="size-3" /> English
            </button>
            <button onClick={() => setLang("te")} className={`px-3 py-1 text-xs rounded-md flex items-center gap-1.5 ${lang === "te" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              <Languages className="size-3" /> తెలుగు
            </button>
          </div>
        }
      />

      <div className="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold flex items-center gap-2 text-primary">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Rythu Bharosa Kendra (RSK) Integration Active
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Advisories are automatically synced with local RSK channels and ready for dissemination via regional SMS campaigns and mobile notifications in Telugu.
          </div>
        </div>
        <button 
          disabled={isBroadcasting || broadcasted}
          onClick={() => {
            setIsBroadcasting(true);
            setTimeout(() => {
              setIsBroadcasting(false);
              setBroadcasted(true);

              // Save to localStorage
              const existing = JSON.parse(localStorage.getItem('rsk_campaigns') || '[]');
              const newCampaign = {
                id: `CAMP-${Math.floor(Math.random() * 10000)}`,
                date: new Date().toLocaleString(),
                count: advisories.length,
                status: "Delivered",
                messages: advisories.map(a => ({
                  farmer: a.farmer_name,
                  parcel: a.parcel_id,
                  type: a.type,
                  text: a.msg
                }))
              };
              localStorage.setItem('rsk_campaigns', JSON.stringify([newCampaign, ...existing]));

              import('sonner').then(({ toast }) => {
                toast.success("Broadcast Campaign Sent", {
                  description: "Advisories have been dispatched to all eligible farmers via RSK SMS gateways.",
                });
              });
            }, 1500);
          }}
          className="h-8 px-4 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-colors self-start md:self-auto shrink-0 shadow-sm flex items-center justify-center gap-2 disabled:opacity-80"
        >
          {isBroadcasting ? (
            <>
              <div className="size-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Sending...
            </>
          ) : broadcasted ? (
            "Campaign Sent"
          ) : (
            "Trigger Broadcast Campaign"
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {advisories.slice(0, 60).map((a) => {
          const icon = a.type === "drought" ? AlertTriangle : a.type === "oilseed" ? Droplets : Sprout;
          const Icon = icon;
          const v = a.type === "drought" ? "danger" : a.type === "oilseed" ? "warning" : "success";
          return (
            <Link 
              key={a.parcel_id} 
              to="/farmer"
              search={{ parcel: a.parcel_id }}
              className="glass rounded-xl p-4 block hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer relative group"
            >
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="size-4 text-primary" />
              </div>
              <div className="flex items-start justify-between mb-2 pr-6">
                <Badge variant={v as any}><Icon className="size-3 mr-1 inline" />{a.type}</Badge>
                <span className="text-[10px] text-muted-foreground font-mono">{a.parcel_id}</span>
              </div>
              <div className="text-sm leading-relaxed mb-3">{a.msg}</div>
              <div className="text-[11px] text-muted-foreground border-t border-border/50 pt-3 flex justify-between items-center">
                <span>{a.village} · {a.mandal}</span>
                <span className="font-semibold text-primary/80">Suitability: {a.score.toFixed(0)}/100</span>
              </div>
            </Link>
          );
        })}
      </div>
    </AppLayout>
  );
}
