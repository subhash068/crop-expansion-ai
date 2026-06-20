import { useQuery } from "@tanstack/react-query";
import type { SatelliteRow, SoilRow, WeatherRow } from "./data";

const API_BASE = "http://localhost:8001";

export const usePredictCrop = (satData?: SatelliteRow) => {
  return useQuery({
    queryKey: ["predictCrop", satData?.parcel_id],
    queryFn: async () => {
      if (!satData) return null;
      
      const payload = {
        NDVI: satData.NDVI,
        EVI: satData.EVI,
        SAVI: satData.SAVI,
        NDWI: satData.NDWI,
        Red: satData.Red,
        Green: satData.Green,
        Blue: satData.Blue,
        NIR: satData.NIR,
        SWIR1: satData.SWIR1,
        SWIR2: satData.SWIR2,
      };

      const res = await fetch(`${API_BASE}/predict/crop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to predict crop");
      return res.json() as Promise<{ predicted_crop: string; confidence: number }>;
    },
    enabled: !!satData,
    staleTime: Infinity,
  });
};

export const usePredictSuitability = (soilData?: SoilRow, weatherData?: WeatherRow, targetCrop?: string) => {
  return useQuery({
    queryKey: ["predictSuitability", soilData?.parcel_id, targetCrop],
    queryFn: async () => {
      if (!soilData || !weatherData || !targetCrop) return null;

      const payload = {
        soil_data: {
          pH: soilData.pH,
          organic_carbon: soilData.organic_carbon,
          nitrogen: soilData.nitrogen_kg_ha,
          phosphorus: soilData.phosphorus_kg_ha,
          potassium: soilData.potassium_kg_ha,
          zinc: soilData.zinc_ppm,
          electrical_conductivity: soilData.electrical_conductivity,
        },
        weather_data: {
          total_rainfall_mm: weatherData.total_rainfall_mm,
          avg_temperature_c: weatherData.avg_temperature_c,
          rainy_days: weatherData.rainy_days,
          evapotranspiration_mm: weatherData.evapotranspiration_mm,
        },
        target_crop: targetCrop,
      };

      const res = await fetch(`${API_BASE}/predict/suitability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to predict suitability");
      return res.json() as Promise<{ target_crop: string; suitability_score: number }>;
    },
    enabled: !!soilData && !!weatherData && !!targetCrop,
    staleTime: Infinity,
  });
};
