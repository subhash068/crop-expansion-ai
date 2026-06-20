import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os

# Data paths
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'public', 'data')
SATELLITE_DATA = os.path.join(DATA_DIR, 'Anantapur_Satellite_Features_1500.csv')
GROUND_TRUTH_DATA = os.path.join(DATA_DIR, 'Anantapur_Crop_GroundTruth_1500_ThreeSeasons.csv')

def load_and_merge_data():
    print("Loading data...")
    sat_df = pd.read_csv(SATELLITE_DATA)
    gt_df = pd.read_csv(GROUND_TRUTH_DATA)

    print(f"Satellite shape: {sat_df.shape}, Ground truth shape: {gt_df.shape}")

    # Merge on parcel_id, season, year
    merged_df = pd.merge(sat_df, gt_df, on=['parcel_id', 'season', 'year'], how='inner')
    print(f"Merged shape: {merged_df.shape}")
    
    return merged_df

def train_crop_classification_model():
    df = load_and_merge_data()

    # Features: satellite indices and bands
    features = ['NDVI', 'EVI', 'SAVI', 'NDWI', 'Red', 'Green', 'Blue', 'NIR', 'SWIR1', 'SWIR2']
    target = 'crop_type'

    # Filter out rows with missing features or target
    df = df.dropna(subset=features + [target])

    X = df[features]
    y = df[target]

    print(f"Training on {len(X)} samples with {len(y.unique())} crop types: {y.unique()}")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    
    print("Training Random Forest model...")
    model.fit(X_train, y_train)

    print("Evaluating model...")
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Model Accuracy: {acc * 100:.2f}%")
    print(classification_report(y_test, y_pred))

    # Save model
    model_path = os.path.join(os.path.dirname(__file__), 'crop_classifier.joblib')
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")

if __name__ == '__main__':
    train_crop_classification_model()
