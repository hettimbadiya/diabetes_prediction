"""
Machine Learning Pipeline for Diabetes Prediction
Preserves the preprocessing, scaling, and model architecture from diabetes_prediction.py.
Trains models once on startup or loads from joblib cache, ensuring fast predictions.
"""

import os
import random
import numpy as np
import pandas as pd
import joblib
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import confusion_matrix, classification_report, accuracy_score, r2_score

CACHE_FILE = os.path.join(os.path.dirname(__file__), "model_cache.joblib")
DATASET_FILE = os.path.join(os.path.dirname(__file__), "diabetes_prediction_dataset.csv")

class DiabetesMLPipeline:
    def __init__(self, dataset_path=DATASET_FILE):
        self.dataset_path = dataset_path
        self.gender_encoder = LabelEncoder()
        self.smoking_encoder = LabelEncoder()
        self.scaler = StandardScaler()
        
        # Primary prediction model
        self.svm_model = None
        
        # Comparison models for dashboard evaluation
        self.knn_model = None
        self.nb_model = None
        self.lr_model = None
        self.lgr_model = None
        self.dt_model = None
        self.rf_model = None
        
        # Metrics storage
        self.metrics = {}
        self.dataset_stats = {}
        self.is_trained = False

    def load_and_train(self, force_retrain=False):
        """Loads cached models if available, otherwise trains from dataset."""
        if not force_retrain and os.path.exists(CACHE_FILE):
            try:
                cached_data = joblib.load(CACHE_FILE)
                self.gender_encoder = cached_data["gender_encoder"]
                self.smoking_encoder = cached_data["smoking_encoder"]
                self.scaler = cached_data["scaler"]
                self.svm_model = cached_data["svm_model"]
                self.knn_model = cached_data["knn_model"]
                self.nb_model = cached_data["nb_model"]
                self.lr_model = cached_data["lr_model"]
                self.lgr_model = cached_data["lgr_model"]
                self.dt_model = cached_data["dt_model"]
                self.rf_model = cached_data["rf_model"]
                self.metrics = cached_data["metrics"]
                self.dataset_stats = cached_data["dataset_stats"]
                self.is_trained = True
                print("[OK] Loaded Diabetes ML Pipeline from cache.")
                return
            except Exception as e:
                print(f"[WARN] Cache load failed ({e}), retraining from dataset...")

        if not os.path.exists(self.dataset_path):
            raise FileNotFoundError(
                f"Dataset not found at: {self.dataset_path}. "
                "Please place 'diabetes_prediction_dataset.csv' in the project directory."
            )

        print(f"Training ML models on dataset: {self.dataset_path}")
        df = pd.read_csv(self.dataset_path)
        raw_rows = len(df)

        # 1. Label encode categorical columns (fit on full dataset)
        df['gender'] = self.gender_encoder.fit_transform(df['gender'].astype(str))
        df['smoking_history'] = self.smoking_encoder.fit_transform(df['smoking_history'].astype(str))

        # 2. Remove duplicate rows (matches diabetes_prediction.py step 3)
        dff = df.drop_duplicates().reset_index(drop=True)
        dedup_rows = len(dff)

        # 3. Features & target separation
        X = dff.drop('diabetes', axis='columns')
        y = dff['diabetes']

        # 4. Standard Scaling (matches diabetes_prediction.py step 5)
        X_scaled = self.scaler.fit_transform(X)

        # 5. Train/Test split with random_state=10
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=10
        )

        # 6. Train all models
        print("-> Training SVC (Support Vector Classifier)...")
        # Matches diabetes_prediction.py: SVC with random_state=10 (no extra calibration wrapper)
        self.svm_model = SVC(random_state=10)
        self.svm_model.fit(X_train, y_train)

        print("-> Training K-Nearest Neighbors...")
        self.knn_model = KNeighborsClassifier()
        self.knn_model.fit(X_train, y_train)

        print("-> Training Gaussian Naive Bayes...")
        self.nb_model = GaussianNB()
        self.nb_model.fit(X_train, y_train)

        print("-> Training Linear Regression (for R2 metric)...")
        self.lr_model = LinearRegression()
        self.lr_model.fit(X_train, y_train)

        print("-> Training Logistic Regression...")
        self.lgr_model = LogisticRegression(max_iter=1000, random_state=10)
        self.lgr_model.fit(X_train, y_train)

        print("-> Training Decision Tree...")
        self.dt_model = DecisionTreeClassifier(random_state=10)
        self.dt_model.fit(X_train, y_train)

        print("-> Training Random Forest...")
        self.rf_model = RandomForestClassifier(n_estimators=100, random_state=10)
        self.rf_model.fit(X_train, y_train)

        # 7. Calculate real metrics
        svc_y_pred = self.svm_model.predict(X_test)
        cm = confusion_matrix(y_test, svc_y_pred).tolist()
        report_dict = classification_report(y_test, svc_y_pred, output_dict=True)

        self.metrics = {
            "svc_train_accuracy": float(self.svm_model.score(X_train, y_train)),
            "svc_test_accuracy": float(self.svm_model.score(X_test, y_test)),
            "knn_accuracy": float(self.knn_model.score(X_test, y_test)),
            "nb_accuracy": float(self.nb_model.score(X_test, y_test)),
            "logistic_regression_accuracy": float(self.lgr_model.score(X_test, y_test)),
            "decision_tree_accuracy": float(self.dt_model.score(X_test, y_test)),
            "random_forest_accuracy": float(self.rf_model.score(X_test, y_test)),
            "linear_regression_r2": float(self.lr_model.score(X_test, y_test)),
            "confusion_matrix": cm,
            "classification_report": report_dict,
            "test_size": len(X_test),
            "train_size": len(X_train),
        }

        class_dist = dff['diabetes'].value_counts().to_dict()
        self.dataset_stats = {
            "total_rows_raw": int(raw_rows),
            "total_rows_clean": int(dedup_rows),
            "duplicates_removed": int(raw_rows - dedup_rows),
            "class_distribution": {
                "non_diabetic": int(class_dist.get(0, 0)),
                "diabetic": int(class_dist.get(1, 0))
            },
            "features": list(X.columns),
            "gender_classes": list(self.gender_encoder.classes_),
            "smoking_classes": list(self.smoking_encoder.classes_)
        }

        # Cache trained pipeline
        cache_payload = {
            "gender_encoder": self.gender_encoder,
            "smoking_encoder": self.smoking_encoder,
            "scaler": self.scaler,
            "svm_model": self.svm_model,
            "knn_model": self.knn_model,
            "nb_model": self.nb_model,
            "lr_model": self.lr_model,
            "lgr_model": self.lgr_model,
            "dt_model": self.dt_model,
            "rf_model": self.rf_model,
            "metrics": self.metrics,
            "dataset_stats": self.dataset_stats
        }
        joblib.dump(cache_payload, CACHE_FILE)
        self.is_trained = True
        print("[OK] All ML models trained and cached successfully.")

    def preprocess_single_input(self, data):
        """
        Safely encodes and scales a single patient feature vector
        using the training-fitted encoders and scaler.
        """
        gender_raw = str(data.get("gender", "Female")).strip()
        # Case matching or fallback
        gender_classes = list(self.gender_encoder.classes_)
        matched_gender = next((c for c in gender_classes if c.lower() == gender_raw.lower()), gender_classes[0])
        gender_val = self.gender_encoder.transform([matched_gender])[0]

        smoking_raw = str(data.get("smoking_history", "never")).strip()
        smoking_classes = list(self.smoking_encoder.classes_)
        matched_smoking = next((c for c in smoking_classes if c.lower() == smoking_raw.lower()), smoking_classes[0])
        smoking_val = self.smoking_encoder.transform([matched_smoking])[0]

        age = float(data.get("age", 0))
        hypertension = int(data.get("hypertension", 0))
        heart_disease = int(data.get("heart_disease", 0))
        bmi = float(data.get("bmi", 0.0))
        hba1c = float(data.get("HbA1c_level", 0.0))
        glucose = float(data.get("blood_glucose_level", 0.0))

        # Vector in exact order expected by model:
        # ['gender', 'age', 'hypertension', 'heart_disease', 'smoking_history', 'bmi', 'HbA1c_level', 'blood_glucose_level']
        feature_names = [
            "gender", "age", "hypertension", "heart_disease",
            "smoking_history", "bmi", "HbA1c_level", "blood_glucose_level"
        ]
        raw_df = pd.DataFrame([[gender_val, age, hypertension, heart_disease, smoking_val, bmi, hba1c, glucose]], columns=feature_names)
        scaled_vector = self.scaler.transform(raw_df)
        return scaled_vector, {
            "gender": matched_gender,
            "age": age,
            "hypertension": hypertension,
            "heart_disease": heart_disease,
            "smoking_history": matched_smoking,
            "bmi": bmi,
            "HbA1c_level": hba1c,
            "blood_glucose_level": glucose
        }

    def predict(self, data):
        """
        Performs SVC prediction on user input data.
        Returns detailed prediction object with risk assessment.
        """
        if not self.is_trained:
            self.load_and_train()

        scaled_vector, normalized_params = self.preprocess_single_input(data)
        
        # Primary SVC prediction
        prediction = int(self.svm_model.predict(scaled_vector)[0])
        
        # SVC (without probability=True) exposes decision_function; map to a 0-1 score
        try:
            if hasattr(self.svm_model, "predict_proba"):
                probabilities = self.svm_model.predict_proba(scaled_vector)[0]
                prob_diabetic = float(probabilities[1])
                confidence = float(max(probabilities))
            else:
                score = float(self.svm_model.decision_function(scaled_vector)[0])
                prob_diabetic = float(1.0 / (1.0 + np.exp(-score)))
                confidence = float(max(prob_diabetic, 1.0 - prob_diabetic))
        except Exception:
            prob_diabetic = 1.0 if prediction == 1 else 0.0
            confidence = 1.0

        label = "Diabetic" if prediction == 1 else "Non-Diabetic"

        # Clinical risk stratification and insights
        bmi = normalized_params["bmi"]
        hba1c = normalized_params["HbA1c_level"]
        glucose = normalized_params["blood_glucose_level"]

        risk_factors = []
        if hba1c >= 6.5:
            risk_factors.append(f"Elevated HbA1c ({hba1c}% - Diabetes threshold is >= 6.5%)")
        elif hba1c >= 5.7:
            risk_factors.append(f"Prediabetic HbA1c ({hba1c}% - Normal is < 5.7%)")

        if glucose >= 200:
            risk_factors.append(f"High Blood Glucose ({glucose} mg/dL - High risk threshold >= 200)")
        elif glucose >= 140:
            risk_factors.append(f"Impaired Glucose Tolerance ({glucose} mg/dL)")

        if bmi >= 30:
            risk_factors.append(f"Obese BMI category ({bmi} kg/m2)")
        elif bmi >= 25:
            risk_factors.append(f"Overweight BMI category ({bmi} kg/m2)")

        if normalized_params["hypertension"] == 1:
            risk_factors.append("History of Hypertension")
        if normalized_params["heart_disease"] == 1:
            risk_factors.append("History of Heart Disease")

        # Determine overall risk category
        if prediction == 1 or prob_diabetic >= 0.65:
            risk_category = "High Risk"
            risk_color = "#ef4444"
        elif prob_diabetic >= 0.35 or len(risk_factors) >= 2:
            risk_category = "Moderate Risk"
            risk_color = "#f59e0b"
        else:
            risk_category = "Low Risk"
            risk_color = "#10b981"

        return {
            "prediction": prediction,
            "label": label,
            "probability": round(prob_diabetic * 100, 1),
            "confidence": round(confidence * 100, 1),
            "risk_category": risk_category,
            "risk_color": risk_color,
            "risk_factors": risk_factors,
            "model_used": "Support Vector Classifier (SVC)",
            "normalized_parameters": normalized_params,
            "disclaimer": "This application is an educational/ML demonstration and is not a medical diagnosis. Please consult a qualified healthcare professional for medical advice."
        }

    def get_metrics(self):
        """Returns all model evaluation metrics."""
        if not self.is_trained:
            self.load_and_train()
        return {
            "metrics": self.metrics,
            "dataset_stats": self.dataset_stats
        }

# Global pipeline singleton instance
pipeline = DiabetesMLPipeline()

def get_pipeline():
    if not pipeline.is_trained:
        pipeline.load_and_train()
    return pipeline
