import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { KpiCard, Section, Badge } from "@/components/Kpi";
import { useGroundTruth, groupBy, sum, MILLETS, OILSEEDS } from "@/lib/data";
import { BadgeCheck, Target, Users, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { chartTooltip } from "./index";
import { useMemo } from "react";

export const Route = createFileRoute("/schemes")({
  head: () => ({ meta: [{ title: "Scheme Monitoring — CropVision AI" }] }),
  component: Schemes,
});

function Schemes() {
  const gt = useGroundTruth().data ?? [];
  const kharif = gt.filter((g) => g.season === "Kharif");

  const mandalScore = useMemo(() => Object.entries(groupBy(kharif, (g) => g.mandal)).map(([mandal, list]) => {
    const millets = sum(list.filter((g) => MILLETS.includes(g.crop_type)), (g) => g.land_area_acres);
    const oilseeds = sum(list.filter((g) => OILSEEDS.includes(g.crop_type)), (g) => g.land_area_acres);
    const total = sum(list, (g) => g.land_area_acres);
    return {
      mandal,
      NFSM: Math.round((millets / total) * 100),
      NMEO: Math.round((oilseeds / total) * 100),
    };
  }).sort((a, b) => (b.NFSM + b.NMEO) - (a.NFSM + a.NMEO)).slice(0, 12), [kharif]);

  const beneficiaries = Math.round(kharif.length * 0.62);

  return (
    <AppLayout>
      <PageHeader title="Scheme Monitoring" subtitle="NFSM & NMEO progress dashboards" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Beneficiaries (Est.)" value={beneficiaries.toLocaleString()} icon={Users} />
        <KpiCard label="NFSM Coverage" value="62%" icon={BadgeCheck} accent="info" />
        <KpiCard label="NMEO Coverage" value="48%" icon={Target} accent="accent" />
        <KpiCard label="Expansion Progress" value="+14%" icon={TrendingUp} accent="warning" trend={{ value: "vs 2024", positive: true }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <Section title="NFSM — National Food Security Mission" subtitle="Millets coverage % by mandal">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mandalScore} layout="vertical">
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
            <BarChart data={mandalScore} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "currentColor" }} />
              <YAxis dataKey="mandal" type="category" tick={{ fontSize: 10, fill: "currentColor" }} width={110} />
              <Tooltip contentStyle={chartTooltip} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="NMEO" fill="#f0c560" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      <Section title="Scheme Effectiveness Scorecard" className="mt-4">
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px]">
              <tr>{["Mandal", "NFSM Score", "NMEO Score", "Combined", "Status"].map(h => <th key={h} className="text-left p-2.5">{h}</th>)}</tr>
            </thead>
            <tbody>
              {mandalScore.map((m) => {
                const c = m.NFSM + m.NMEO;
                return (
                  <tr key={m.mandal} className="border-t border-border hover:bg-muted/20">
                    <td className="p-2.5 font-medium">{m.mandal}</td>
                    <td className="p-2.5">{m.NFSM}%</td>
                    <td className="p-2.5">{m.NMEO}%</td>
                    <td className="p-2.5 font-semibold">{c}</td>
                    <td className="p-2.5">
                      <Badge variant={c >= 70 ? "success" : c >= 40 ? "warning" : "danger"}>
                        {c >= 70 ? "On Track" : c >= 40 ? "Needs Push" : "Lagging"}
                      </Badge>
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
