import pandas as pd
import numpy as np

def calculate_suitability(soil_data, weather_data, target_crop):
    """
    Calculate a suitability score (0-100) for a target crop based on soil and weather.
    Target crops: 'Millets', 'Pulses', 'Oilseeds'
    """
    
    # Define ideal conditions based on agronomic knowledge (simplified)
    # This acts as the "expert system" or suitability algorithm
    crop_requirements = {
        'Millets': {
            'pH_min': 5.5, 'pH_max': 8.0,
            'rainfall_min': 300, 'rainfall_max': 600,
            'temp_min': 26, 'temp_max': 33,
            'nitrogen_min': 20, # lower requirements
        },
        'Pulses': {
            'pH_min': 6.0, 'pH_max': 7.5,
            'rainfall_min': 400, 'rainfall_max': 700,
            'temp_min': 20, 'temp_max': 30,
            'nitrogen_min': 15, # nitrogen fixing
        },
        'Oilseeds': {
            'pH_min': 6.0, 'pH_max': 7.5,
            'rainfall_min': 500, 'rainfall_max': 800,
            'temp_min': 25, 'temp_max': 32,
            'nitrogen_min': 30,
        }
    }
    
    if target_crop not in crop_requirements:
        return 0.0

    reqs = crop_requirements[target_crop]

    # Initialize scores
    soil_score = 100.0
    weather_score = 100.0

    # pH score
    ph = soil_data.get('pH', 7.0)
    if ph < reqs['pH_min'] or ph > reqs['pH_max']:
        soil_score -= 30 * min(abs(ph - reqs['pH_min']), abs(ph - reqs['pH_max']))

    # Nitrogen score
    n = soil_data.get('nitrogen_kg_ha', 20)
    if n < reqs['nitrogen_min']:
        soil_score -= 20 * (reqs['nitrogen_min'] - n) / reqs['nitrogen_min']

    # Rainfall score
    rain = weather_data.get('total_rainfall_mm', 500)
    if rain < reqs['rainfall_min'] or rain > reqs['rainfall_max']:
        weather_score -= 40 * min(abs(rain - reqs['rainfall_min']), abs(rain - reqs['rainfall_max'])) / 100

    # Temperature score
    temp = weather_data.get('avg_temperature_c', 28)
    if temp < reqs['temp_min'] or temp > reqs['temp_max']:
        weather_score -= 30 * min(abs(temp - reqs['temp_min']), abs(temp - reqs['temp_max'])) / 5

    # Ensure scores are within 0-100 bounds
    soil_score = max(0, min(100, soil_score))
    weather_score = max(0, min(100, weather_score))

    # Overall suitability (weighted 60% soil, 40% weather)
    overall_suitability = (0.6 * soil_score) + (0.4 * weather_score)
    
    return round(overall_suitability, 2)

if __name__ == '__main__':
    # Test
    soil = {'pH': 6.5, 'nitrogen_kg_ha': 25}
    weather = {'total_rainfall_mm': 450, 'avg_temperature_c': 28}
    print("Millets suitability:", calculate_suitability(soil, weather, 'Millets'))
    print("Pulses suitability:", calculate_suitability(soil, weather, 'Pulses'))
    print("Oilseeds suitability:", calculate_suitability(soil, weather, 'Oilseeds'))
