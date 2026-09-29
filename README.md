# DiabetesCare AI 🩺

A full-stack diabetes risk prediction web application powered by scikit-learn Machine Learning (SVC, Random Forest, KNN, and more), built with Flask.

## 📋 Features

- **Login Page** — Demo authentication system, easily swappable with Firebase/Auth0
- **Dashboard** — Real-time stats, model accuracy, recent predictions
- **Diabetes Prediction Form** — 8-feature clinical input form with live validation badges
- **Prediction Result** — Risk gauge, parameter summary, clinical risk factors
- **Prediction History** — Full audit log with search & filter
- **Model Performance** — Live accuracy benchmarks, confusion matrix, classification report
- **About Page** — ML pipeline explanation

## 🧠 ML Models Evaluated

| Model | Type |
|-------|------|
| Support Vector Classifier (SVC) | Primary prediction model |
| Random Forest | Ensemble |
| K-Nearest Neighbors | Instance-based |
| Logistic Regression | Linear |
| Decision Tree | Tree-based |
| Naive Bayes | Probabilistic |
| Linear Regression | Regression (R² metric) |

## 📁 Project Structure

```
daibites p/
├── app.py                          # Flask backend & REST API
├── model.py                        # ML pipeline (train, cache, predict)
├── diabetes_prediction.py          # Original ML script (preserved)
├── diabetes_prediction_dataset.csv # Dataset (place here!)
├── requirements.txt
├── .env.example
├── .gitignore
├── templates/
│   └── index.html                  # Full SPA frontend
└── static/
    ├── css/style.css               # Modern dark healthcare design
    └── js/app.js                   # Frontend logic & API calls
```

## 🚀 Quick Start (Windows)

### 1. Place dataset
Put `diabetes_prediction_dataset.csv` in the **same folder** as `app.py`.

### 2. Create virtual environment & install packages

```cmd
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Run the application

```cmd
python app.py
```

### 4. Open in browser

```
http://127.0.0.1:5000
```

## 🔑 Demo Login Credentials

| Email | Password | Role |
|-------|----------|------|
| `admin@diabetescare.ai` | `password123` | Dr. Sarah Mitchell (Lead) |
| `doctor@diabetescare.ai` | `password123` | Dr. Alex Carter |
| `demo@diabetescare.ai` | `demo` | Demo Clinician |
| *Any email* | `demo` | Generic Practitioner |

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/status` | Check session |
| POST | `/api/predict` | Run prediction |
| GET | `/api/metrics` | Model evaluation metrics |
| GET | `/api/history` | Prediction history |
| DELETE | `/api/history` | Clear history |
| GET | `/api/samples` | Sample patient presets |

### Example POST `/api/predict`

```json
{
  "gender": "Male",
  "age": 45,
  "hypertension": 0,
  "heart_disease": 0,
  "smoking_history": "never",
  "bmi": 27.5,
  "HbA1c_level": 5.8,
  "blood_glucose_level": 130
}
```

Response:
```json
{
  "success": true,
  "result": {
    "prediction": 0,
    "label": "Non-Diabetic",
    "probability": 12.4,
    "risk_category": "Low Risk",
    ...
  }
}
```

## ⚠️ Medical Disclaimer

This application is an **educational/ML demonstration** and is **NOT** a medical diagnosis. Please consult a qualified healthcare professional for medical advice.
