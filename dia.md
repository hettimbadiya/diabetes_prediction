I have an existing Python diabetes prediction ML project in `diabetes_prediction.py`. Use this existing code as the ML foundation and build a complete modern web application around it.

IMPORTANT:

* Do NOT replace the existing ML model logic unnecessarily.
* Preserve the existing preprocessing, StandardScaler, SVC model, and prediction workflow.
* Refactor the ML code into reusable functions/classes if necessary so it can be called safely from the web application.
* The existing project uses `diabetes_prediction_dataset.csv`.
* The current ML code encodes `gender` and `smoking_history`, scales the features using StandardScaler, trains an SVC model, and predicts whether a person is diabetic or non-diabetic.
* The existing code also evaluates multiple models including SVC, KNN, Naive Bayes, Logistic Regression, Decision Tree, and Random Forest. Keep these available for the dashboard/model evaluation section.
* Do not train the model every time a user clicks Predict. Load/train it once when the application starts or use a cached model.

Build a polished full-stack diabetes prediction application with the following structure.

1. LOGIN PAGE
   Create a professional login page:

* App name: "DiabetesCare AI"
* Email/username field
* Password field
* Show/hide password button
* Remember me checkbox
* Login button
* "Forgot password?" link
* Modern medical/AI visual design
* Responsive on desktop and mobile
* Use clean typography, cards, subtle animations, rounded corners and a professional healthcare dashboard appearance.

For this demo project, authentication can initially use a simple local/demo authentication system. Clearly separate authentication code from the ML code so it can later be replaced with Firebase/Auth0/database authentication.

2. DASHBOARD
   After login, show a dashboard with:

* Welcome message
* "Diabetes Prediction" primary card
* Total predictions
* Recent predictions
* Model accuracy/evaluation information
* Small charts/statistics
* Navigation sidebar

Sidebar:

* Dashboard
* Diabetes Prediction
* Prediction History
* Model Performance
* About
* Logout

3. DIABETES PREDICTION PAGE
   Create a clean medical form based EXACTLY on the input features expected by my existing dataset/model.

The form should collect:

* gender
* age
* hypertension
* heart_disease
* smoking_history
* bmi
* HbA1c_level
* blood_glucose_level

Use appropriate UI controls:

* Gender → dropdown
* Age → number input
* Hypertension → Yes/No
* Heart disease → Yes/No
* Smoking history → dropdown
* BMI → decimal number input
* HbA1c level → decimal number input
* Blood glucose level → number input

Do not ask the user to enter the `diabetes` target value because that is what the model predicts.

Add:

* Clear form button
* Predict Diabetes button
* Input validation
* Helpful units/placeholders where appropriate
* Friendly validation messages
* Prevent invalid/empty values from being submitted

4. PREDICTION RESULT
   After clicking Predict:

* Send the entered values to the Python backend.
* Apply exactly the same preprocessing used by the existing ML code.
* Run the SVC prediction.
* Display a large result card:

  * "Diabetic" or "Non-Diabetic"
* Show the prediction clearly with an appropriate visual indicator.
* Display the submitted parameters in a readable summary.
* Add a timestamp.
* Provide a "New Prediction" button.

IMPORTANT MEDICAL DISCLAIMER:
Display:
"This application is an educational/ML demonstration and is not a medical diagnosis. Please consult a qualified healthcare professional for medical advice."

Do NOT claim that the prediction is a confirmed medical diagnosis.

5. PREDICTION HISTORY
   Create a page that stores predictions made during the session/demo.

Show a table:

* Date/time
* Age
* Gender
* BMI
* HbA1c
* Blood glucose
* Prediction
* Model used

Add:

* Search
* Filter by result
* Clear history button

6. MODEL PERFORMANCE PAGE
   Use the evaluation already present in my Python code.

Display:

* SVC accuracy
* KNN accuracy
* Naive Bayes accuracy
* Logistic Regression accuracy
* Decision Tree accuracy
* Random Forest accuracy
* Linear Regression R² separately, because it is a regression metric

Create attractive charts comparing the classification model accuracies.

Also display the SVC:

* Train accuracy
* Test accuracy
* Confusion matrix
* Classification report

The existing Python code already calculates the SVC confusion matrix and classification report. Reuse those calculations rather than inventing values.

IMPORTANT:
Never hard-code fake accuracy numbers. Calculate them from the actual dataset at runtime.

7. ABOUT PAGE
   Explain:

* This is a diabetes prediction ML demonstration.
* The application uses machine-learning classification.
* The underlying Python project uses scikit-learn.
* Explain briefly that the application predicts the `diabetes` target based on the input features.
* Include the medical/educational disclaimer.

8. BACKEND ARCHITECTURE
   Use Python for the backend.

Prefer:

* Flask or FastAPI for the API
* A clean REST API endpoint such as `/api/predict`
* Separate ML/model module
* Separate routes/API module
* Separate frontend/static files

Suggested structure:

project/
├── app.py
├── diabetes_prediction.py
├── model.py
├── requirements.txt
├── diabetes_prediction_dataset.csv
├── templates/
├── static/
│   ├── css/
│   ├── js/
│   └── images/
└── README.md

You may modify this structure if there is a cleaner architecture.

9. MACHINE LEARNING REQUIREMENTS
   The existing code currently:

* loads `diabetes_prediction_dataset.csv`
* label-encodes `gender`
* label-encodes `smoking_history`
* removes duplicate rows
* separates `diabetes` as the target
* applies StandardScaler
* splits the data into train/test sets
* trains an SVC model
* evaluates multiple models

Preserve this workflow where appropriate.

However, make the preprocessing safe and reusable for individual user predictions.

IMPORTANT:
Do not independently fit a new encoder/scaler on the single user's input. The web prediction must use the preprocessing learned from the training data.

Prefer saving/loading a trained pipeline with joblib or pickle, or create a robust reusable preprocessing/model pipeline.

10. API
    Create an endpoint:

POST `/api/predict`

Example JSON:

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

Return something similar to:

{
"prediction": 0,
"label": "Non-Diabetic"
}

Handle errors gracefully.

11. UI DESIGN
    Make the UI look like a real modern healthcare/AI SaaS dashboard, NOT like a basic student HTML form.

Design:

* Professional healthcare appearance
* Clean dashboard
* Sidebar navigation
* Responsive layout
* Modern cards
* Smooth transitions
* Good spacing
* Accessible form labels
* Clear error states
* Loading state while prediction is running
* Success/result state
* Mobile responsive

Use a coherent design system throughout the application.

12. SECURITY / CODE QUALITY

* Never expose passwords in frontend code.
* Validate all API inputs on the backend.
* Do not execute arbitrary user input.
* Keep secrets in environment variables.
* Add `.env.example`.
* Add `.gitignore`.
* Do not commit the dataset if it contains sensitive personal information.
* Add proper error handling.
* Keep ML code separate from UI code.

13. RUNNING THE PROJECT
    Make the project easy to run locally.

Create:

* `requirements.txt`
* `README.md`

README must contain exact commands for Windows:

python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py

Tell me the local URL, for example:
http://127.0.0.1:5000

Also explain where I should put:
`diabetes_prediction_dataset.csv`

14. IMPORTANT FINAL REQUIREMENT
    After implementing everything:

* Run the application.
* Check for Python errors.
* Check that the dataset loads.
* Check that the ML model trains successfully.
* Check that the login page works.
* Check that login redirects to dashboard.
* Test the prediction API with sample input.
* Test that a prediction appears correctly in the UI.
* Test model performance charts.
* Fix any errors before finishing.

Do not just create mockup screens. Build a FUNCTIONAL application connected to the actual Python ML model and dataset.

At the end, give me:

1. Final project structure
2. Exact installation commands
3. Exact command to run the app
4. Local URL
5. Demo login credentials
6. Short explanation of how the frontend connects to the Python ML model
7. Any changes made to the original `diabetes_prediction.py`
