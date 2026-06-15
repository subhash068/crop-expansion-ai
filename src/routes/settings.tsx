import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Section } from "@/components/Kpi";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — CropVision AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppLayout>
      <PageHeader title="Settings" subtitle="Platform configuration & user preferences" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Profile">
          <div className="space-y-3 text-sm">
            <Field label="Name" value="Agriculture Officer" />
            <Field label="Role" value="District Agriculture Officer" />
            <Field label="District" value="Anantapur" />
            <Field label="Email" value="ao.anantapur@ap.gov.in" />
          </div>
        </Section>
        <Section title="Data Sources">
          <div className="space-y-2 text-sm">
            {[
              ["Sentinel-2 Imagery", "Weekly · Connected"],
              ["Sentinel-1 SAR", "Weekly · Connected"],
              ["APSDPS Weather", "Daily · Connected"],
              ["APSAC Soil Maps", "Static · Connected"],
              ["e-Panta Labels", "Seasonal · Connected"],
              ["Planet 3m Imagery", "Weekly · Available"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-border/40 py-2">
                <span>{k}</span>
                <span className="text-success text-xs">● {v}</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Model Configuration">
          <div className="space-y-2 text-sm">
            {[["Crop Classifier", "XGBoost · v2.4"], ["Suitability Model", "LightGBM · v1.8"], ["Yield Predictor", "Random Forest · v3.1"], ["Time-Series Model", "TensorFlow · v2.15"]].map(([k, v]) => (
              <Field key={k} label={k} value={v} />
            ))}
          </div>
        </Section>
        <Section title="Notifications">
          <div className="space-y-3 text-sm">
            {["Weekly NDVI updates", "Diversification opportunities", "Drought alerts", "Scheme deadlines"].map((n) => (
              <label key={n} className="flex items-center justify-between cursor-pointer">
                <span>{n}</span>
                <input type="checkbox" defaultChecked className="accent-primary size-4" />
              </label>
            ))}
          </div>
        </Section>
      </div>
    </AppLayout>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-border/40">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
