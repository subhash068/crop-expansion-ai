# CropVision AI — Precision Agriculture Dashboard

![CropVision AI](https://img.shields.io/badge/Status-Active-success) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white) ![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB) ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white) ![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?style=flat&logo=Cloudflare&logoColor=white)

CropVision AI is a high-performance, interactive Business Intelligence dashboard designed to monitor and optimize precision agriculture in Anantapur, Andhra Pradesh. 

By synthesizing geospatial data, ground truth data (e-Panta), soil health records (APSAC), and weather information (APSDPS), the application empowers agricultural stakeholders with actionable insights to drive crop diversification and improve land fertility.

## 🚀 Live Demo
**[View the Live Dashboard](https://subhash068-andhra-agri-ai.innovative383.workers.dev/)**

## ✨ Key Features

- **Executive Dashboard:** District-wide agricultural KPIs, crop distribution tracking, and dynamic diversification metrics (Shannon index).
- **Soil Intelligence Module:** Parcel-level soil health analysis, including normalized fertility scoring and interactive radar charts for nutrient profiling.
- **Fertilizer Advisory System:** A custom, rule-based recommendation engine that calculates exact nitrogen (N), phosphorus (P), and potassium (K) deficiencies to suggest precise Urea, SSP, and MOP dosages based on specific crop requirements.
- **Geospatial & Seasonal Trends:** Analyzes cultivation areas across multiple seasons, mandals, and villages to identify high-potential expansion zones for specific crops (e.g., Millets, Pulses, Oilseeds).
- **Edge Deployment:** Deployed on Cloudflare Workers using Nitro for lightning-fast server-side rendering (SSR) and global performance.

## 🛠️ Technology Stack

- **Frontend Framework:** React 19, TypeScript
- **Routing & State:** TanStack Start, TanStack Router
- **Build Tool:** Vite
- **Styling:** Tailwind CSS, Radix UI (Headless components), Framer Motion (Animations)
- **Data Visualization:** Recharts
- **Deployment:** Nitro, Cloudflare Workers

## ⚙️ Local Development

### Prerequisites
- Node.js (v18+)
- npm or bun

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`.

## 📦 Build and Deployment

This project uses Nitro to build a highly optimized edge-compatible output. 

1. Build the production application:
```bash
npm run build
```
*(Note: Ensure `nitro: true` is enabled in `vite.config.ts` so the `.output` directory is properly generated).*

2. Deploy the built application to Cloudflare (requires Wrangler authentication):
```bash
npx nitro deploy --prebuilt
```

## 📊 Data Integration & Analytics
The dashboard is designed to ingest and merge multiple datasets:
- **Ground Truth Data:** Crop types, cultivated areas, and yield tracking.
- **Soil Health Records:** pH, organic carbon, drainage classes, and micronutrients.
- **Weather Data:** Seasonal variations impacting crop suitability.

*(Note: Data pipelines and data ingestion scripts are located in the `data_pipeline/` directory and Python scripts at the project root).*

---
*Built with modern web technologies for scalable, data-driven agricultural analytics.*
