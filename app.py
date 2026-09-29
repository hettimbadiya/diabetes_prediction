"""
DiabetesCare AI - Flask Backend Application
Provides REST API endpoints for authentication, ML prediction, model evaluation, and history.
"""

import os
import json
from datetime import datetime
from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
from model import get_pipeline

app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = os.environ.get("SECRET_KEY", "diabetes-care-ai-super-secure-key-2026")
CORS(app)

HISTORY_FILE = os.path.join(os.path.dirname(__file__), "prediction_history.json")

def load_history():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_history(history):
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2)
    except Exception as e:
        print(f"Error saving history: {e}")

# Demo Users
DEMO_USERS = {
    "admin@diabetescare.ai": {"password": "password123", "name": "Dr. Sarah Mitchell", "role": "Lead Endocrinologist"},
    "doctor@diabetescare.ai": {"password": "password123", "name": "Dr. Alex Carter", "role": "Clinical Researcher"},
    "demo@diabetescare.ai": {"password": "demo", "name": "Demo Clinician", "role": "Staff Practitioner"}
}

# Predefined Sample Patients for easy 1-click demo/testing
SAMPLE_PATIENTS = [
    {
        "id": "sample-healthy",
        "title": "Healthy / Low Risk Profile",
        "badge": "Low Risk",
        "gender": "Female",
        "age": 28,
        "hypertension": 0,
        "heart_disease": 0,
        "smoking_history": "never",
        "bmi": 21.8,
        "HbA1c_level": 4.8,
        "blood_glucose_level": 90
    },
    {
        "id": "sample-prediabetic",
        "title": "Prediabetic / Borderline Profile",
        "badge": "Moderate Risk",
        "gender": "Male",
        "age": 48,
        "hypertension": 1,
        "heart_disease": 0,
        "smoking_history": "former",
        "bmi": 28.4,
        "HbA1c_level": 6.1,
        "blood_glucose_level": 145
    },
    {
        "id": "sample-diabetic",
        "title": "Diabetic / High Risk Profile",
        "badge": "High Risk",
        "gender": "Male",
        "age": 62,
        "hypertension": 1,
        "heart_disease": 1,
        "smoking_history": "current",
        "bmi": 34.6,
        "HbA1c_level": 7.8,
        "blood_glucose_level": 210
    }
]

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/auth/status", methods=["GET"])
def auth_status():
    user = session.get("user")
    if user:
        return jsonify({"authenticated": True, "user": user})
    return jsonify({"authenticated": False})

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    # For demo ease, accept registered demo credentials or any email with demo password
    if email in DEMO_USERS and DEMO_USERS[email]["password"] == password:
        user_info = {"email": email, "name": DEMO_USERS[email]["name"], "role": DEMO_USERS[email]["role"]}
        session["user"] = user_info
        return jsonify({"success": True, "user": user_info, "message": "Login successful"})
    elif email and password == "demo":
        user_info = {"email": email, "name": "Medical Practitioner", "role": "Clinician"}
        session["user"] = user_info
        return jsonify({"success": True, "user": user_info, "message": "Login successful"})
    elif email and password:
        # Permissive demo login mode for seamless evaluation
        user_info = {"email": email, "name": email.split("@")[0].capitalize(), "role": "Practitioner"}
        session["user"] = user_info
        return jsonify({"success": True, "user": user_info, "message": "Login successful"})
    
    return jsonify({"success": False, "message": "Invalid email or password"}), 400

@app.route("/api/auth/logout", methods=["POST"])
def logout():
    session.pop("user", None)
    return jsonify({"success": True, "message": "Logged out successfully"})

@app.route("/api/samples", methods=["GET"])
def get_samples():
    return jsonify({"success": True, "samples": SAMPLE_PATIENTS})

@app.route("/api/metrics", methods=["GET"])
def get_metrics():
    try:
        pipeline = get_pipeline()
        data = pipeline.get_metrics()
        return jsonify({"success": True, "data": data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No input data provided"}), 400

        # Validate required numeric fields
        required_fields = ["gender", "age", "hypertension", "heart_disease", "smoking_history", "bmi", "HbA1c_level", "blood_glucose_level"]
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                return jsonify({"success": False, "error": f"Missing required field: {field}"}), 400

        # Type conversion & ranges validation
        try:
            age = float(data["age"])
            if not (0 <= age <= 125):
                return jsonify({"success": False, "error": "Age must be between 0 and 125"}), 400
            
            bmi = float(data["bmi"])
            if not (10 <= bmi <= 90):
                return jsonify({"success": False, "error": "BMI must be between 10 and 90"}), 400

            hba1c = float(data["HbA1c_level"])
            if not (3.0 <= hba1c <= 18.0):
                return jsonify({"success": False, "error": "HbA1c level must be between 3.0% and 18.0%"}), 400

            glucose = float(data["blood_glucose_level"])
            if not (40 <= glucose <= 450):
                return jsonify({"success": False, "error": "Blood Glucose level must be between 40 and 450 mg/dL"}), 400

            hypertension = int(data["hypertension"])
            heart_disease = int(data["heart_disease"])
        except ValueError:
            return jsonify({"success": False, "error": "Invalid numerical values provided."}), 400

        pipeline = get_pipeline()
        result = pipeline.predict(data)
        
        # Add timestamp & ID for history
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        history_record = {
            "id": f"pred_{int(datetime.now().timestamp()*1000)}",
            "timestamp": timestamp,
            "inputs": result["normalized_parameters"],
            "prediction": result["prediction"],
            "label": result["label"],
            "probability": result["probability"],
            "risk_category": result["risk_category"],
            "risk_color": result["risk_color"],
            "model_used": result["model_used"]
        }

        # Store in persistent history
        history = load_history()
        history.insert(0, history_record)
        if len(history) > 100:  # Keep last 100
            history = history[:100]
        save_history(history)

        result["id"] = history_record["id"]
        result["timestamp"] = timestamp
        return jsonify({"success": True, "result": result})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/history", methods=["GET"])
def get_history():
    history = load_history()
    search = request.args.get("search", "").lower()
    filter_label = request.args.get("filter", "all").lower()

    filtered = []
    for item in history:
        # Filter by outcome
        if filter_label != "all" and item.get("label", "").lower() != filter_label:
            continue
        
        # Search query across parameters
        if search:
            inputs = item.get("inputs", {})
            search_str = f"{item.get('label','')} {inputs.get('gender','')} {inputs.get('age','')} {inputs.get('bmi','')} {inputs.get('smoking_history','')}".lower()
            if search not in search_str:
                continue
        
        filtered.append(item)

    return jsonify({"success": True, "history": filtered, "total": len(filtered)})

@app.route("/api/history", methods=["DELETE"])
def clear_history():
    save_history([])
    return jsonify({"success": True, "message": "Prediction history cleared"})

if __name__ == "__main__":
    # Preload and train pipeline on startup
    print("Pre-loading Diabetes ML Pipeline...")
    get_pipeline()
    print("DiabetesCare AI starting on http://127.0.0.1:5000")
    # use_reloader=False so the pipeline is not trained twice on Windows
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)
