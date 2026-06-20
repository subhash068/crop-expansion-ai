import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useGroundTruth, useSuitability, useWeather, useSoil, useYield, cropCategory } from "@/lib/data";
import { Leaf, Map, Bell, Search, CloudRain, Droplets, ArrowRight, LineChart, MessageSquare, Send, CheckCircle2, Bot, Sun, ArrowLeft } from "lucide-react";
import { usePredictCrop } from "@/lib/api";
import { T } from "@/lib/i18n";

export const Route = createFileRoute("/farmer")({
  head: () => ({ meta: [{ title: "Farmer Portal — CropVision" }] }),
  component: FarmerApp,
});

function FarmerApp() {
  const [activeTab, setActiveTab] = useState<"home" | "land" | "advisory" | "market" | "chat">("home");
  const [parcelIdInput, setParcelIdInput] = useState("AP_ANP_00087"); // Default for demo
  const [loggedInParcel, setLoggedInParcel] = useState<string | null>(null);
  const [lang, setLang] = useState<"en" | "te">("en");
  const t = T[lang];

  // Data hooks
  const gtData = useGroundTruth().data ?? [];
  const suitData = useSuitability().data ?? [];
  const weatherData = useWeather().data ?? [];
  const soilData = useSoil().data ?? [];
  const yieldData = useYield().data ?? [];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (parcelIdInput.trim()) {
      setLoggedInParcel(parcelIdInput.trim());
    }
  };

  // Farmer's specific data
  const parcelBase = useMemo(() => gtData.find(g => g.parcel_id === loggedInParcel), [gtData, loggedInParcel]);
  const parcelSoil = useMemo(() => soilData.find(s => s.parcel_id === loggedInParcel), [soilData, loggedInParcel]);
  const parcelWeather = useMemo(() => weatherData.find(w => w.parcel_id === loggedInParcel), [weatherData, loggedInParcel]);
  const parcelSuit = useMemo(() => suitData.find(s => s.parcel_id === loggedInParcel), [suitData, loggedInParcel]);
  const parcelYield = useMemo(() => yieldData.find(y => y.parcel_id === loggedInParcel), [yieldData, loggedInParcel]);

  // Mobile App Container
  return (
    <div className="h-[100dvh] bg-black/95 text-foreground flex justify-center overflow-hidden relative">
      <button 
        onClick={() => window.location.href = '/'} 
        className="hidden md:flex absolute left-8 top-8 items-center gap-2 text-muted-foreground hover:text-foreground transition-colors bg-background border border-border/50 px-4 py-2 rounded-xl shadow-lg"
      >
        <ArrowLeft className="size-4" />
        <span className="font-medium text-sm">Back to Dashboard</span>
      </button>
      {/* Phone constraint container to make it look like an app on desktop */}
      <div className="w-full max-w-md bg-background h-full relative shadow-2xl flex flex-col">
        
        {/* Header */}
        <header className="p-4 border-b border-border/50 bg-background/80 backdrop-blur sticky top-0 z-10 flex justify-between items-center">
          <div className="font-semibold text-lg flex items-center gap-2 text-primary">
            <Leaf className="size-5" /> CropVision
          </div>
          <div className="flex gap-2 items-center">
            {loggedInParcel && (
              <div className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
                {loggedInParcel}
              </div>
            )}
            <select 
              value={lang}
              onChange={(e) => setLang(e.target.value as "en" | "te")}
              className="text-xs bg-muted px-2 py-1 rounded text-primary font-medium hover:bg-muted/80 outline-none cursor-pointer border-none"
            >
              <option value="en">English</option>
              <option value="te">తెలుగు</option>
            </select>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4">
          {!loggedInParcel ? (
            <div className="flex flex-col items-center justify-center h-full space-y-6 pt-20">
              <div className="p-4 bg-primary/10 rounded-full text-primary">
                <Leaf className="size-12" />
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">{t.welcome}</h1>
                <p className="text-muted-foreground text-sm">{t.enterParcel}</p>
              </div>
              <form onSubmit={handleLogin} className="w-full max-w-xs space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder={t.placeholder} 
                    value={parcelIdInput}
                    onChange={(e) => setParcelIdInput(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 rounded-xl bg-muted/50 border border-border outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <button type="submit" className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2">
                  {t.access} <ArrowRight className="size-4" />
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Tab Content */}
              {activeTab === "home" && (
                <HomeTab 
                  name={parcelBase?.farmer_name || "Farmer"} 
                  village={parcelBase?.village}
                  base={parcelBase}
                  weather={parcelWeather}
                  advisory={parcelSuit}
                  t={t}
                />
              )}
              {activeTab === "land" && (
                <LandTab 
                  base={parcelBase}
                  soil={parcelSoil}
                  t={t}
                />
              )}
              {activeTab === "advisory" && (
                <AdvisoryTab 
                  suit={parcelSuit}
                  weather={parcelWeather}
                  name={parcelBase?.farmer_name || "Farmer"}
                  base={parcelBase}
                  t={t}
                />
              )}
              {activeTab === "market" && (
                <MarketTab 
                  base={parcelBase}
                  yieldData={parcelYield}
                  suit={parcelSuit}
                  t={t}
                />
              )}
              {activeTab === "chat" && (
                <ChatTab 
                  key={lang}
                  name={parcelBase?.farmer_name || "Farmer"} 
                  base={parcelBase} 
                  soil={parcelSoil} 
                  weather={parcelWeather} 
                  suit={parcelSuit} 
                  yieldData={parcelYield}
                  t={t}
                />
              )}
            </div>
          )}
        </main>

        {/* Bottom Navigation */}
        {loggedInParcel && (
          <nav className="absolute bottom-0 w-full h-16 bg-background/90 backdrop-blur border-t border-border/50 flex justify-around items-center px-2 pb-safe">
            <NavItem icon={<Leaf />} label={t.home} active={activeTab === "home"} onClick={() => setActiveTab("home")} />
            <NavItem icon={<Map />} label={t.land} active={activeTab === "land"} onClick={() => setActiveTab("land")} />
            <NavItem icon={<LineChart />} label={t.market} active={activeTab === "market"} onClick={() => setActiveTab("market")} />
            <NavItem icon={<Bell />} label={t.advisory} active={activeTab === "advisory"} onClick={() => setActiveTab("advisory")} badge={true} />
            <NavItem icon={<MessageSquare />} label={t.chat} active={activeTab === "chat"} onClick={() => setActiveTab("chat")} />
          </nav>
        )}
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, badge }: any) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-20 h-full gap-1 transition-colors relative ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
      <div className={`p-1 rounded-full ${active ? "bg-primary/10" : ""}`}>
        {icon}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
      {badge && <span className="absolute top-2 right-4 size-2 bg-destructive rounded-full" />}
    </button>
  );
}

// Subcomponents for tabs
function HomeTab({ name, village, base, weather, advisory, t }: any) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">{t.hello}, {name} 👋</h2>
        <p className="text-muted-foreground text-sm">{t.status} {village}.</p>
      </div>

      <div className="glass rounded-2xl p-4 flex justify-between items-center">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">{t.currCrop}</div>
          <div className="text-lg font-bold">{base?.crop_type || "--"}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">{t.stage}</div>
          <div className="text-sm font-semibold text-primary">{base?.crop_stage || "--"}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
          <CloudRain className="size-6 text-info" />
          <div>
            <div className="text-sm font-semibold">{weather?.total_rainfall_mm?.toFixed(0) || "--"} mm</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.seasonRain}</div>
          </div>
        </div>
        <div className="glass p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
          <Sun className="size-6 text-warning" />
          <div>
            <div className="text-sm font-semibold">{weather?.avg_temperature_c?.toFixed(1) || "--"} °C</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.avgTemp}</div>
          </div>
        </div>
      </div>

      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2 text-primary font-semibold">
          <Bell className="size-4" /> {t.priority}
        </div>
        <p className="text-sm text-primary/90 leading-relaxed">
          {t.advMsg}
        </p>
      </div>
    </div>
  );
}

function LandTab({ base, soil, t }: any) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">{t.landHealth}</h2>
      
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex justify-between border-b border-border/50 pb-2">
          <span className="text-muted-foreground text-sm">{t.area}</span>
          <span className="font-semibold">{base?.land_area_acres} {t.acres}</span>
        </div>
        <div className="flex justify-between border-b border-border/50 pb-2">
          <span className="text-muted-foreground text-sm">{t.currCrop}</span>
          <span className="font-semibold">{base?.crop_type}</span>
        </div>
        <div className="flex justify-between pb-1">
          <span className="text-muted-foreground text-sm">{t.soilType}</span>
          <span className="font-semibold">{base?.soil_type}</span>
        </div>
      </div>

      <h3 className="text-lg font-semibold pt-2">{t.nutrients}</h3>
      <div className="grid grid-cols-3 gap-3">
        <NutrientCard label={t.nitrogen} val={soil?.nitrogen_kg_ha} target={200} />
        <NutrientCard label={t.phosphorus} val={soil?.phosphorus_kg_ha} target={50} />
        <NutrientCard label={t.potassium} val={soil?.potassium_kg_ha} target={250} />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4 flex flex-col justify-center">
          <span className="text-muted-foreground text-[10px] uppercase tracking-wide">{t.soilPh}</span>
          <span className={`text-xl font-bold mt-1 ${soil?.pH >= 6.5 && soil?.pH <= 7.5 ? "text-success" : "text-warning"}`}>
            {soil?.pH?.toFixed(1) || "--"}
          </span>
        </div>
        <div className="glass rounded-2xl p-4 flex flex-col justify-center">
          <span className="text-muted-foreground text-[10px] uppercase tracking-wide">{t.orgCarbon}</span>
          <span className="text-xl font-bold mt-1 text-primary">{soil?.organic_carbon?.toFixed(2) || "--"}%</span>
        </div>
      </div>

      <h3 className="text-lg font-semibold pt-2">{t.soil_properties}</h3>
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex justify-between border-b border-border/50 pb-2">
          <span className="text-muted-foreground text-sm">{t.sulphur}</span>
          <span className="font-semibold">{soil?.sulphur_ppm ? `${soil.sulphur_ppm.toFixed(2)} ppm` : "--"}</span>
        </div>
        <div className="flex justify-between border-b border-border/50 pb-2">
          <span className="text-muted-foreground text-sm">{t.zinc}</span>
          <span className="font-semibold">{soil?.zinc_ppm ? `${soil.zinc_ppm.toFixed(2)} ppm` : "--"}</span>
        </div>
        <div className="flex justify-between pb-1">
          <span className="text-muted-foreground text-sm">{t.electrical_cond}</span>
          <span className="font-semibold">{soil?.electrical_conductivity ? `${soil.electrical_conductivity.toFixed(2)} dS/m` : "--"}</span>
        </div>
      </div>

      <h3 className="text-lg font-semibold pt-2">{t.fertCalc}</h3>
      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 space-y-3">
        <p className="text-xs text-muted-foreground">{t.fertMsg}</p>
        
        <div className="flex justify-between items-center border-b border-primary/10 pb-2">
          <span className="text-sm font-medium">{t.urea}</span>
          <span className="font-bold">{Math.max(0, Math.round((200 - (soil?.nitrogen_kg_ha || 0)) * (base?.land_area_acres || 1) * 0.46))} kg</span>
        </div>
        <div className="flex justify-between items-center border-b border-primary/10 pb-2">
          <span className="text-sm font-medium">{t.ssp}</span>
          <span className="font-bold">{Math.max(0, Math.round((50 - (soil?.phosphorus_kg_ha || 0)) * (base?.land_area_acres || 1) * 1.5))} kg</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">{t.mop}</span>
          <span className="font-bold">{Math.max(0, Math.round((250 - (soil?.potassium_kg_ha || 0)) * (base?.land_area_acres || 1) * 0.6))} kg</span>
        </div>
      </div>
    </div>
  );
}

function NutrientCard({ label, val, target }: any) {
  const pct = Math.min(100, Math.round(((val || 0) / target) * 100));
  return (
    <div className="glass p-3 rounded-xl flex flex-col items-center justify-center text-center gap-1">
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
      <div className="font-bold text-lg">{val?.toFixed(0) || "--"}</div>
      <div className="w-full bg-muted rounded-full h-1.5 mt-1 overflow-hidden">
        <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AdvisoryTab({ suit, weather, name, base, t }: any) {
  const [applied, setApplied] = useState(() => {
    const existing = JSON.parse(localStorage.getItem('rsk_applications') || '[]');
    return existing.some((app: any) => app.parcel_id === base?.parcel_id);
  });
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = () => {
    setIsApplying(true);
    setTimeout(() => {
      setIsApplying(false);
      setApplied(true);
      
      const existing = JSON.parse(localStorage.getItem('rsk_applications') || '[]');
      const parcelId = base?.parcel_id || 'Unknown';
      if (!existing.some((app: any) => app.parcel_id === parcelId)) {
        existing.unshift({
          parcel_id: parcelId,
          farmer_name: name,
          village: base?.village || 'Unknown',
          crop: suit?.recommended_crop || 'Unknown',
          date: new Date().toLocaleDateString()
        });
        localStorage.setItem('rsk_applications', JSON.stringify(existing));
      }
    }, 1500);
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">{t.advSub}</h2>
      
      <div className="space-y-3">
        <div className="bg-accent/10 border border-accent/20 rounded-2xl p-4">
          <div className="text-xs font-semibold text-accent mb-2 uppercase tracking-wide">{t.govtScheme}</div>
          <p className="text-sm leading-relaxed">{suit?.recommended_crop ? t.advMsg : t.no_advisory}</p>
          
          {applied ? (
            <div className="mt-4 w-full py-3 bg-success/20 text-success rounded-lg font-medium text-sm flex items-center justify-center gap-2">
              <CheckCircle2 className="size-4" /> {t.applied}
            </div>
          ) : (
            <button 
              disabled={isApplying}
              onClick={handleApply}
              className="mt-4 w-full py-3 bg-accent text-accent-foreground rounded-lg font-semibold text-sm transition-colors hover:bg-accent/90 disabled:opacity-80 flex items-center justify-center gap-2"
            >
              {isApplying ? (
                <>
                  <div className="size-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                  Applying...
                </>
              ) : (
                t.apply
              )}
            </button>
          )}
        </div>

        {weather?.drought_risk === "High" && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4">
            <div className="text-xs font-semibold text-destructive mb-2 uppercase tracking-wide">{t.weather_alert}</div>
            <p className="text-sm leading-relaxed">{t.drought_msg}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MarketTab({ base, yieldData, suit, t }: any) {
  const currentIncome = yieldData?.gross_income_rs || 0;
  const potentialIncrease = Math.round(currentIncome * 1.35); // Simulated 35% increase

  const formatCurrency = (val: number) => val.toLocaleString("en-IN", { maximumFractionDigits: 0 });

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">{t.marketProfit}</h2>
      
      <div className="glass rounded-2xl p-4 space-y-4">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">{t.currCrop} ({base?.crop_type})</div>
          <div className="text-2xl font-bold text-foreground">₹{formatCurrency(currentIncome)}</div>
          <div className="text-xs text-muted-foreground mt-1">Est. Gross Income at ₹{yieldData?.market_price_per_kg}/kg</div>
        </div>
        
        <div className="border-t border-border/50 pt-4">
          <div className="text-xs text-accent uppercase tracking-wider font-semibold">{t.aiRec} ({suit?.recommended_crop || "Millet"})</div>
          <div className="text-2xl font-bold text-accent">₹{formatCurrency(potentialIncrease)}</div>
          <div className="text-xs text-muted-foreground mt-1">Est. Gross Income with 50% seed subsidy</div>
        </div>
      </div>

      {currentIncome > 0 && (
        <div className="bg-success/10 border border-success/20 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <LineChart className="size-5 text-success shrink-0 mt-0.5" />
            <p className="text-sm text-success font-semibold">
              How we calculate your extra ₹{formatCurrency(potentialIncrease - currentIncome)}:
            </p>
          </div>
          
          <div className="pl-8 space-y-2 text-sm text-success/90">
            <div className="flex justify-between border-b border-success/10 pb-1">
              <span>Higher Market Price</span>
              <span className="font-semibold">+₹{formatCurrency((potentialIncrease - currentIncome) * 0.65)}</span>
            </div>
            <div className="flex justify-between border-b border-success/10 pb-1">
              <span>Water Cost Savings</span>
              <span className="font-semibold">+₹{formatCurrency((potentialIncrease - currentIncome) * 0.20)}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span>Govt Seed Subsidy</span>
              <span className="font-semibold">+₹{formatCurrency((potentialIncrease - currentIncome) * 0.15)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 mt-4">
        <h3 className="font-semibold text-lg text-accent mb-3">{t.actionPlan}</h3>
        <ul className="space-y-3 text-sm text-accent/90">
          <li className="flex gap-2">
            <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
            <span><strong>{t.suggested}:</strong> Switch your {base?.parcel_area_acres?.toFixed(2) || 1.5} acres to <strong>{suit?.recommended_crop || "Bengal Gram"}</strong> this season.</span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
            <span><strong>{t.fertStrategy}:</strong> Apply <strong>{Math.round((base?.parcel_area_acres || 1.5) * 20)} kg DAP</strong> and <strong>{Math.round((base?.parcel_area_acres || 1.5) * 10)} kg MOP</strong>. Avoid excess Urea, as {suit?.recommended_crop || "Bengal Gram"} fixes its own nitrogen!</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function ChatTab({ name, base, soil, weather, suit, yieldData, t }: any) {
  const [messages, setMessages] = useState([
    { text: t.chatWelcome, sender: "ai" }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const currentIncome = yieldData?.gross_income_rs || 0;
  const potentialIncrease = Math.round(currentIncome * 1.35);

  const chips = [
    {
      q: t.chip1_q,
      a: t.chip1_a(base?.soil_type, soil?.pH, soil?.nitrogen_kg_ha, soil?.organic_carbon)
    },
    {
      q: t.chip2_q,
      a: t.chip2_a(suit?.recommended_crop || "Bengal Gram")
    },
    {
      q: t.chip3_q,
      a: weather?.drought_risk === "High" ? t.chip3_a_yes : t.chip3_a_no(weather?.total_rainfall_mm?.toFixed(0) || 0)
    },
    {
      q: t.chip4_q,
      a: t.chip4_a(suit?.recommended_crop || "Bengal Gram")
    },
    {
      q: t.chip5_q,
      a: t.chip5_a(
        base?.land_area_acres || 1, 
        Math.max(0, Math.round((200 - (soil?.nitrogen_kg_ha || 0)) * (base?.land_area_acres || 1) * 0.46)),
        Math.max(0, Math.round((50 - (soil?.phosphorus_kg_ha || 0)) * (base?.land_area_acres || 1) * 1.5)),
        Math.max(0, Math.round((250 - (soil?.potassium_kg_ha || 0)) * (base?.land_area_acres || 1) * 0.6))
      )
    },
    {
      q: t.chip6_q,
      a: t.chip6_a(base?.crop_type || "Current", suit?.recommended_crop || "Bengal Gram", currentIncome, potentialIncrease)
    },
    {
      q: t.chip7_q,
      a: t.chip7_a(base?.village || "Unknown", base?.district || "Unknown", "Andhra Pradesh")
    },
    {
      q: t.chip8_q,
      a: t.chip8_a(base?.crop_type || "Unknown", base?.crop_stage || "Unknown")
    },
    {
      q: t.chip9_q,
      a: t.chip9_a(weather?.season_rainfall_mm || 0)
    },
    {
      q: t.chip10_q,
      a: t.chip10_a(weather?.temperature_avg_c || 0)
    },
    {
      q: t.chip11_q,
      a: t.chip11_a(weather?.humidity_avg_percent || 0)
    },
    {
      q: t.chip12_q,
      a: t.chip12_a(soil?.zinc_ppm || 0)
    },
    {
      q: t.chip13_q,
      a: t.chip13_a(soil?.sulphur_ppm || 0)
    },
    {
      q: t.chip14_q,
      a: t.chip14_a(soil?.electrical_cond_ds_m || 0)
    },
    {
      q: t.chip15_q,
      a: t.chip15_a(suit?.reason || "Based on predictive AI modeling.")
    },
    {
      q: t.chip16_q,
      a: t.chip16_a(suit?.expected_yield_tons_per_ha || 0)
    },
    {
      q: t.chip17_q,
      a: t.chip17_a(yieldData?.market_price_per_kg || 0)
    },
    {
      q: t.chip18_q,
      a: t.chip18_a(currentIncome)
    },
    {
      q: t.chip19_q,
      a: t.chip19_a(base?.land_area_acres || 0)
    },
    {
      q: t.chip20_q,
      a: t.chip20_a(base?.phone || "Unknown")
    }
  ];

  // Initialize queue with indices 0 to chips.length - 1
  const [queue, setQueue] = useState(Array.from({ length: chips.length }, (_, i) => i));

  const handleChipClick = (chip: any, originalIndex: number) => {
    if (isTyping) return;
    setMessages(prev => [...prev, { sender: "user", text: chip.q }]);
    
    // Move clicked chip to the end of the queue (loop format)
    setQueue(prev => {
      const next = prev.filter(i => i !== originalIndex);
      return [...next, originalIndex];
    });

    setIsTyping(true);
    
    setTimeout(() => {
      setMessages(prev => [...prev, { sender: "ai", text: chip.a }]);
      setIsTyping(false);
    }, 1200);
  };

  const visibleChips = queue.slice(0, 3).map(idx => ({ ...chips[idx], originalIndex: idx }));

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border/50">
        <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center">
          <Bot className="size-4 text-primary" />
        </div>
        <div>
          <h2 className="font-bold leading-tight">{t.copilot}</h2>
          <p className="text-[10px] text-success font-medium">{t.online}</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-4 pb-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.sender === "user" ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted rounded-bl-none"}`}>
              {m.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="max-w-[85%] p-3 rounded-2xl bg-muted rounded-bl-none flex gap-1.5 items-center h-10">
              <span className="size-1.5 bg-primary/60 rounded-full animate-bounce" />
              <span className="size-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="size-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto space-y-2 pt-2 border-t border-border/50">
        <p className="text-xs text-muted-foreground mb-1">{t.quickQ}</p>
        <div className="flex flex-wrap gap-2">
          {visibleChips.map((chip) => (
            <button 
              key={chip.originalIndex}
              disabled={isTyping}
              onClick={() => handleChipClick(chip, chip.originalIndex)}
              className="text-left text-[11px] font-medium px-3 py-2 bg-muted/50 hover:bg-muted text-foreground border border-border/50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {chip.q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
