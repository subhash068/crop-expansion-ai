from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import os
import pandas as pd
from typing import Dict, Any

from .suitability import calculate_suitability

app = FastAPI(title="Crop Expansion AI API", version="1.0.0")

# Load model
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'crop_classifier.joblib')
model = None

@app.on_event("startup")
def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print("Crop classification model loaded.")
    else:
        print("Warning: Crop classification model not found.")

class CropPredictionRequest(BaseModel):
    NDVI: float
    EVI: float
    SAVI: float
    NDWI: float
    Red: float
    Green: float
    Blue: float
    NIR: float
    SWIR1: float
    SWIR2: float

class SuitabilityRequest(BaseModel):
    soil_data: Dict[str, float]
    weather_data: Dict[str, float]
    target_crop: str

@app.post("/predict/crop")
def predict_crop(request: CropPredictionRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    # Convert to dataframe to match training format
    input_data = pd.DataFrame([request.model_dump()])
    
    # Ensure correct column order
    features = ['NDVI', 'EVI', 'SAVI', 'NDWI', 'Red', 'Green', 'Blue', 'NIR', 'SWIR1', 'SWIR2']
    input_data = input_data[features]
    
    prediction = model.predict(input_data)[0]
    
    # If the model supports predict_proba
    try:
        probabilities = model.predict_proba(input_data)[0]
        max_prob = float(max(probabilities))
    except:
        max_prob = 1.0

    return {
        "predicted_crop": prediction,
        "confidence": round(max_prob * 100, 2)
    }

@app.post("/predict/suitability")
def predict_suitability(request: SuitabilityRequest):
    score = calculate_suitability(
        soil_data=request.soil_data,
        weather_data=request.weather_data,
        target_crop=request.target_crop
    )
    
    return {
        "target_crop": request.target_crop,
        "suitability_score": score
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("data_pipeline.api:app", host="0.0.0.0", port=8000, reload=True)
