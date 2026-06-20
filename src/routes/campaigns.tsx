import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Badge } from "@/components/Kpi";
import { useState, useEffect } from "react";
import { MessageSquare, Users, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaign Logs — CropVision AI" },
    ]
  }),
  component: Campaigns,
});

function Campaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('rsk_campaigns') || '[]');
    setCampaigns(data);
  }, []);

  return (
    <AppLayout>
      <PageHeader
        title="SMS Campaign Logs"
        subtitle="History of all advisories dispatched via RSK gateways"
      />

      <div className="space-y-6">
        {campaigns.length === 0 ? (
          <div className="p-8 text-center border border-border rounded-xl bg-muted/20">
            <MessageSquare className="size-8 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="text-sm font-semibold">No campaigns sent yet</h3>
            <p className="text-xs text-muted-foreground mt-1">Trigger a broadcast from the Advisory Center to see logs here.</p>
          </div>
        ) : (
          campaigns.map((camp) => (
            <div key={camp.id} className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="p-4 bg-muted/30 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-semibold text-primary">{camp.id}</span>
                    <Badge variant="success" className="h-5"><CheckCircle2 className="size-3 mr-1 inline" /> {camp.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{camp.date}</div>
                </div>
                <div className="flex items-center gap-4 text-sm font-medium">
                  <div className="flex items-center gap-1.5 bg-background border px-3 py-1.5 rounded-md">
                    <Users className="size-4 text-muted-foreground" />
                    {camp.count} Farmers Reached
                  </div>
                </div>
              </div>
              <div className="p-0 max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur-md">
                    <tr>
                      <th className="px-4 py-3 font-medium">Farmer</th>
                      <th className="px-4 py-3 font-medium">Parcel ID</th>
                      <th className="px-4 py-3 font-medium">Message Dispatch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {camp.messages.map((msg: any, idx: number) => (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{msg.farmer}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{msg.parcel}</td>
                        <td className="px-4 py-3 text-xs leading-relaxed text-muted-foreground max-w-lg">{msg.text}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </AppLayout>
  );
}
