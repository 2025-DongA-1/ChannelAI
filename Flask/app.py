import os
import pickle
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Load models setup
MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "ml_models"))

models = {}

def load_models():
    global models
    try:
        models['roas_predictor'] = pickle.load(open(os.path.join(MODELS_DIR, 'roas_predictor.pkl'), 'rb'))
        models['platform_recommender'] = pickle.load(open(os.path.join(MODELS_DIR, 'platform_recommender.pkl'), 'rb'))
        models['scaler'] = pickle.load(open(os.path.join(MODELS_DIR, 'scaler.pkl'), 'rb'))
        models['scaler_platform'] = pickle.load(open(os.path.join(MODELS_DIR, 'scaler_platform.pkl'), 'rb'))
        models['label_encoders'] = pickle.load(open(os.path.join(MODELS_DIR, 'label_encoders.pkl'), 'rb'))
        models['feature_columns'] = pickle.load(open(os.path.join(MODELS_DIR, 'feature_columns.pkl'), 'rb'))
        models['platform_feature_columns'] = pickle.load(open(os.path.join(MODELS_DIR, 'platform_feature_columns.pkl'), 'rb'))
        print("Models loaded successfully.")
    except Exception as e:
        print(f"Error loading models: {e}")

load_models()

@app.route('/api/predict_roas', methods=['POST'])
def predict_roas():
    try:
        data = request.json
        # Expecting a list of dictionaries or a single dictionary
        if isinstance(data, dict):
            data = [data]
            
        df = pd.DataFrame(data)
        
        # Preprocessing categorical variables
        encoders = models['label_encoders']
        for col in ['industry', 'platform', 'region', 'age_group', 'gender']:
            if col in df.columns:
                # Handle unseen labels by assigning to a default or handling gracefully
                try:
                    df[f'{col}_encoded'] = encoders[col].transform(df[col])
                except ValueError:
                    # In case of unseen label, default to first class
                    df[f'{col}_encoded'] = 0

        # Select correct columns order
        X = df[models['feature_columns']]
        
        # Scale
        X_scaled = models['scaler'].transform(X)
        
        # Predict
        predictions = models['roas_predictor'].predict(X_scaled)
        
        return jsonify({
            'status': 'success',
            'predictions': predictions.tolist()
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

@app.route('/api/recommend_platform', methods=['POST'])
def recommend_platform():
    try:
        data = request.json
        if isinstance(data, dict):
            data = [data]
            
        df = pd.DataFrame(data)
        
        encoders = models['label_encoders']
        # For platform recommendation, input shouldn't have 'platform' encoded
        for col in ['industry', 'region', 'age_group', 'gender']:
            if col in df.columns:
                try:
                    df[f'{col}_encoded'] = encoders[col].transform(df[col])
                except ValueError:
                    df[f'{col}_encoded'] = 0
                    
        X = df[models['platform_feature_columns']]
        X_scaled = models['scaler_platform'].transform(X)
        
        recommendations = models['platform_recommender'].predict(X_scaled)
        
        return jsonify({
            'status': 'success',
            'recommendations': recommendations.tolist()
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'models_loaded': len(models) == 7})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
