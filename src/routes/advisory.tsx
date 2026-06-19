import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Section, Badge } from "@/components/Kpi";
import { useSuitability, useGroundTruth, useWeather, cropCategory } from "@/lib/data";
import { Languages, Sprout, Droplets, AlertTriangle } from "lucide-react";
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
    millet_expand: (crop: string) => `Millet (${crop}) cultivation is recommended in this parcel. Suitable for rainfed conditions with good drought tolerance.`,
    oilseed: (crop: string) => `Suitable for oilseed expansion — ${crop} is recommended given current soil and rainfall profile.`,
    pulses: (crop: string) => `${crop} cultivation will improve soil nitrogen and provide better returns this season.`,
    drought: () => "High drought risk detected. Switch to short-duration drought-tolerant varieties.",
    rainfed: () => "Rainfed millet cultivation advised. Avoid water-intensive crops this season.",
  },
  te: {
    millet_expand: (crop: string) => `ఈ పార్సెల్‌లో మిల్లెట్ (${crop}) సాగు సిఫార్సు చేయబడింది. వర్షాధార పరిస్థితులకు అనుకూలం.`,
    oilseed: (crop: string) => `నూనెగింజల విస్తరణకు అనుకూలం — ${crop} సాగు సిఫార్సు చేయబడింది.`,
    pulses: (crop: string) => `${crop} సాగు భూమి సారాన్ని మెరుగుపరుస్తుంది మరియు మంచి లాభాలు ఇస్తుంది.`,
    drought: () => "అధిక కరువు ప్రమాదం. తక్కువ కాలం, కరువును తట్టుకునే రకాలకు మారండి.",
    rainfed: () => "వర్షాధార మిల్లెట్ సాగు సలహా ఇవ్వబడుతుంది.",
  },
};

function Advisory() {
  const suit = useSuitability().data ?? [];
  const gt = useGroundTruth().data ?? [];
  const w = useWeather().data ?? [];
  const [lang, setLang] = useState<"en" | "te">("en");

  const advisories = useMemo(() => {
    const gMap = new Map(gt.filter((g) => g.season === "Kharif").map((g) => [g.parcel_id, g]));
    const wMap = new Map(w.filter((x) => x.season === "Kharif").map((x) => [x.parcel_id, x]));
    return suit.filter((s) => s.season === "Kharif").map((s) => {
      const g = gMap.get(s.parcel_id);
      const we = wMap.get(s.parcel_id);
      const cat = cropCategory(s.recommended_crop);
      const t = ADVISORY_TEMPLATES[lang];
      let msg = "";
      let type: "millet" | "oilseed" | "pulse" | "drought" | "rainfed" = "millet";
      if (we?.drought_risk === "High") { msg = t.drought(); type = "drought"; }
      else if (cat === "Millets") { msg = t.millet_expand(s.recommended_crop); type = "millet"; }
      else if (cat === "Oilseeds") { msg = t.oilseed(s.recommended_crop); type = "oilseed"; }
      else if (cat === "Pulses") { msg = t.pulses(s.recommended_crop); type = "pulse"; }
      else { msg = t.rainfed(); type = "rainfed"; }
      return { parcel_id: s.parcel_id, village: g?.village, mandal: g?.mandal, msg, type, score: s.suitability_score };
    }).sort((a, b) => b.score - a.score);
  }, [suit, gt, w, lang]);

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
        <button className="h-8 px-4 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-colors self-start md:self-auto shrink-0 shadow-sm">
          Trigger Broadcast Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {advisories.slice(0, 60).map((a) => {
          const icon = a.type === "drought" ? AlertTriangle : a.type === "oilseed" ? Droplets : Sprout;
          const Icon = icon;
          const v = a.type === "drought" ? "danger" : a.type === "oilseed" ? "warning" : "success";
          return (
            <div key={a.parcel_id} className="glass rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <Badge variant={v as any}><Icon className="size-3 mr-1 inline" />{a.type}</Badge>
                <span className="text-[10px] text-muted-foreground font-mono">{a.parcel_id}</span>
              </div>
              <div className="text-sm leading-relaxed mb-2">{a.msg}</div>
              <div className="text-[11px] text-muted-foreground border-t border-border/50 pt-2">
                {a.village} · {a.mandal} · Score {a.score.toFixed(0)}
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
