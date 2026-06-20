import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { KpiCard, Section, Badge } from "@/components/Kpi";
import { useGroundTruth, useSuitability, groupBy, sum, MILLETS, OILSEEDS, PULSES } from "@/lib/data";
import { BadgeCheck, Target, Users, TrendingUp, Sparkles, Send } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { chartTooltip } from "./index";
import { useMemo } from "react";

export const Route = createFileRoute("/schemes")({
  head: () => ({ meta: [{ title: "Scheme Monitoring — CropVision AI" }] }),
  component: Schemes,
});

function Schemes() {
  const gt = useGroundTruth().data ?? [];
  const suit = useSuitability().data ?? [];
  const kharif = gt.filter((g) => g.season === "Kharif");

  const mandalOpportunity = useMemo(() => {
    const parcelToMandal: Record<string, string> = {};
    gt.forEach(g => { parcelToMandal[g.parcel_id] = g.mandal; });

    const gtGrouped = groupBy(kharif, (g) => g.mandal);
    const suitGrouped = groupBy(suit, (s) => parcelToMandal[s.parcel_id] || "Unknown");

    return Object.entries(gtGrouped).map(([mandal, gtList]) => {
      const sList = suitGrouped[mandal] || [];
      
      const totalAcres = sum(gtList, g => g.land_area_acres) || 1;
      const nfsmAcres = sum(gtList.filter(g => MILLETS.includes(g.crop_type) || PULSES.includes(g.crop_type)), g => g.land_area_acres);
      const nmeoAcres = sum(gtList.filter(g => OILSEEDS.includes(g.crop_type)), g => g.land_area_acres);
      
      const NFSM = Math.round((nfsmAcres / totalAcres) * 100);
      const NMEO = Math.round((nmeoAcres / totalAcres) * 100);

      const milletSuits = sList.filter(s => MILLETS.includes(s.recommended_crop)).map(s => s.suitability_score);
      const oilseedSuits = sList.filter(s => OILSEEDS.includes(s.recommended_crop)).map(s => s.suitability_score);

      const avgMilletsSuit = Math.round(milletSuits.length ? sum(milletSuits, v => v) / milletSuits.length : 0);
      const avgOilseedsSuit = Math.round(oilseedSuits.length ? sum(oilseedSuits, v => v) / oilseedSuits.length : 0);

      const nfsmOpp = avgMilletsSuit - NFSM;
      const nmeoOpp = avgOilseedsSuit - NMEO;
      const totalOpportunity = Math.max(0, nfsmOpp) + Math.max(0, nmeoOpp);

      return {
        mandal, NFSM, NMEO, avgMilletsSuit, avgOilseedsSuit, totalOpportunity
      };
    }).sort((a, b) => b.totalOpportunity - a.totalOpportunity);
  }, [kharif, suit]);

  const beneficiaries = Math.round(kharif.length * 0.62);

  const totalAcres = sum(kharif, g => g.land_area_acres) || 1;
  const totalNfsm = sum(kharif.filter((g) => MILLETS.includes(g.crop_type) || PULSES.includes(g.crop_type)), g => g.land_area_acres);
  const totalNmeo = sum(kharif.filter((g) => OILSEEDS.includes(g.crop_type)), g => g.land_area_acres);
  const nfsmCoverage = Math.round((totalNfsm / totalAcres) * 100);
  const nmeoCoverage = Math.round((totalNmeo / totalAcres) * 100);

  return (
    <AppLayout>
      <PageHeader title="Scheme Monitoring" subtitle="NFSM & NMEO progress dashboards & AI-driven target opportunities" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Beneficiaries (Est.)" value={beneficiaries.toLocaleString()} icon={Users} />
        <KpiCard label="NFSM Coverage" value={`${nfsmCoverage}%`} icon={BadgeCheck} accent="info" />
        <KpiCard label="NMEO Coverage" value={`${nmeoCoverage}%`} icon={Target} accent="accent" />
        <KpiCard label="Expansion Progress" value="+14%" icon={TrendingUp} accent="warning" trend={{ value: "vs 2024", positive: true }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <Section title="NFSM — National Food Security Mission" subtitle="Millets coverage % by mandal">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mandalOpportunity.slice(0, 12)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "currentColor" }} />
              <YAxis dataKey="mandal" type="category" tick={{ fontSize: 10, fill: "currentColor" }} width={110} />
              <Tooltip contentStyle={chartTooltip} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="NFSM" fill="#5fcf80" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="NMEO — National Mission on Edible Oils" subtitle="Oilseeds coverage % by mandal">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mandalOpportunity.slice(0, 12)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "currentColor" }} />
              <YAxis dataKey="mandal" type="category" tick={{ fontSize: 10, fill: "currentColor" }} width={110} />
              <Tooltip contentStyle={chartTooltip} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="NMEO" fill="#f0c560" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      <Section 
        title={<span className="flex items-center gap-2"><Sparkles className="size-5 text-accent" /> AI Target List: Highest Opportunity Regions</span>} 
        subtitle="Mandals ranked by missed opportunity (High AI crop suitability but currently low scheme adoption)"
        className="mt-4 border-accent/20"
      >
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px]">
              <tr>
                <th className="text-left p-2.5">Mandal</th>
                <th className="text-center p-2.5 text-primary">Millets Suitability</th>
                <th className="text-center p-2.5 text-primary">NFSM Coverage</th>
                <th className="text-center p-2.5 border-l border-border/50 text-warning">Oilseeds Suitability</th>
                <th className="text-center p-2.5 text-warning">NMEO Coverage</th>
                <th className="text-left p-2.5">AI Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {mandalOpportunity.map((m) => {
                const isPrime = m.totalOpportunity >= 60;
                const isSaturated = m.totalOpportunity < 20;
                return (
                  <tr key={m.mandal} className={`border-t border-border hover:bg-muted/20 ${isPrime ? 'bg-accent/5' : ''}`}>
                    <td className="p-2.5 font-medium">{m.mandal}</td>
                    
                    {/* NFSM / Millets */}
                    <td className="p-2.5 text-center font-bold text-foreground">{m.avgMilletsSuit}/100</td>
                    <td className="p-2.5 text-center text-muted-foreground">{m.NFSM}%</td>

                    {/* NMEO / Oilseeds */}
                    <td className="p-2.5 text-center font-bold border-l border-border/50 text-foreground">{m.avgOilseedsSuit}/100</td>
                    <td className="p-2.5 text-center text-muted-foreground">{m.NMEO}%</td>

                    <td className="p-2.5">
                      {isPrime ? (
                        <button 
                          onClick={() => toast.success(`Outreach Campaign Initiated`, {
                            description: `Targeting farmers in ${m.mandal} to drive adoption.`,
                          })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent/20 text-accent font-semibold hover:bg-accent hover:text-accent-foreground transition-colors w-max"
                        >
                          <Send className="size-3" /> Initiate Campaign
                        </button>
                      ) : (
                        <Badge variant={isSaturated ? "success" : "default"}>
                          {isSaturated ? "Saturated" : "Moderate Opportunity"}
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </AppLayout>
  );
}
