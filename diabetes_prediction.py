"""
Diabetes Prediction - merged from Dib_pred.ipynb
Place 'diabetes_prediction_dataset.csv' in the same folder as this script
(or pass a path:  python diabetes_prediction.py path/to/file.csv)
"""

import os
import sys
import random

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sb

from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn import tree
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import confusion_matrix, classification_report


# ------------------------------------------------------------------
# 1. Load data
# ------------------------------------------------------------------


df = pd.read_csv(r"D:\daibites p\diabetes_prediction_dataset.csv")
print("Data shape:", df.shape)
print(df.head())

# ------------------------------------------------------------------
# 2. Encode categorical columns
# ------------------------------------------------------------------
lbl = LabelEncoder()
df['gender'] = lbl.fit_transform(df.gender)
df['smoking_history'] = lbl.fit_transform(df.smoking_history)

# ------------------------------------------------------------------
# 3. Remove duplicates
# ------------------------------------------------------------------
dff = df.drop_duplicates().reset_index(drop=True)
print("\nRows before removing duplicates:", len(df))
print("Rows after removing duplicates :", len(dff))
print("\nClass distribution:")
print(dff.diabetes.value_counts())

# ------------------------------------------------------------------
# 4. Class distribution plot
# ------------------------------------------------------------------
plt.figure(figsize=(5, 3))
plt.hist(dff.diabetes, edgecolor='black')
plt.title('Diabetes class distribution')
plt.show()

# ------------------------------------------------------------------
# 5. Features / target, scaling, split
# ------------------------------------------------------------------
X = dff.drop('diabetes', axis='columns')
y = dff.diabetes

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X) # all values are now in the same scale -1 to 1

X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=10
)
print("\nTrain size:", len(X_train))
print("Test size :", len(X_test))


# ------------------------------------------------------------------
# 6. Models
# ------------------------------------------------------------------
svm_model = SVC()
svm_model.fit(X_train, y_train)
print('\nAccuracy of SVC                :', svm_model.score(X_test, y_test))

knn = KNeighborsClassifier()
knn.fit(X_train, y_train)
print('Accuracy of KNN                :', knn.score(X_test, y_test))

NB = GaussianNB()
NB.fit(X_train, y_train)
print('Accuracy of Naive Bayes        :', NB.score(X_test, y_test))

LR = LinearRegression()
LR.fit(X_train, y_train)
print('R^2 of Linear Regression       :', LR.score(X_test, y_test))

LGR = LogisticRegression()
LGR.fit(X_train, y_train)
print('Accuracy of Logistic Regression:', LGR.score(X_test, y_test))

DT = tree.DecisionTreeClassifier()
DT.fit(X_train, y_train)
print('Accuracy of Decision Tree      :', DT.score(X_test, y_test))

RF = RandomForestClassifier()
RF.fit(X_train, y_train)
print('Accuracy of Random Forest      :', RF.score(X_test, y_test))

# ------------------------------------------------------------------
# 7. Sample prediction with SVC (random row)
# ------------------------------------------------------------------
index = random.randrange(0, len(dff))
row_raw = X.iloc[index]                 # original (readable) values
row_scaled = X_scaled[index].reshape(1, -1)   # scaled values the model expects

print('\nActual Target :', dff.iloc[index]['diabetes'])
pred = svm_model.predict(row_scaled)
print('Predicted Target :', pred[0])
print('\nResult : ', end='')
print('Non Diabetic' if pred[0] == 0 else 'Diabetic')

print('\nData Given : ')
print('Row No. ', index, '\n')
print(row_raw)
print()

# ------------------------------------------------------------------
# 8. Evaluation of SVC
# ------------------------------------------------------------------
y_pred = svm_model.predict(X_test)
cm = confusion_matrix(y_test, y_pred)
print("Confusion matrix (rows = truth, columns = predicted):")
print(cm)

plt.figure(figsize=(7, 5))
sb.heatmap(cm, annot=True, fmt='d')
plt.xlabel('Predicted')
plt.ylabel('Truth')
plt.title('SVC Confusion Matrix')
plt.show()

print("\nClassification report:")
print(classification_report(y_test, y_pred))

print("SVC train accuracy:", svm_model.score(X_train, y_train))
print("SVC test accuracy :", svm_model.score(X_test, y_test))
