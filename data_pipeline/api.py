from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import os
import pandas as pd
from typing import Dict, Any

from .suitability import calculate_suitability

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Crop Expansion AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

try:
    # pyrefly: ignore [missing-import]
    import google.generativeai as genai
except ImportError:
    genai = None

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
def chat_endpoint(request: ChatRequest):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or genai is None:
        return {"response": "Hello! I am ready to answer any question, but my AI backend is not fully set up. Please install `google-generativeai` and set the GEMINI_API_KEY environment variable on the server!"}
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        system_prompt = "You are Farmer Copilot, a helpful AI assistant for Indian farmers using the CropVision app. Answer concisely and politely. Question: "
        response = model.generate_content(system_prompt + request.message)
        
        return {"response": response.text}
    except Exception as e:
        return {"response": f"Sorry, I encountered an error: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("data_pipeline.api:app", host="0.0.0.0", port=8000, reload=True)
