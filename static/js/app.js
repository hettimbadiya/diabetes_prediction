/**
 * DiabetesCare AI — Client-Side Application Logic
 * Interacts with Flask API for prediction, metrics, history, and authentication.
 */

// Application State
const state = {
  user: null,
  activeTab: 'dashboard',
  history: [],
  metrics: null,
  samples: [],
  historyFilter: 'all',
  charts: {}
};

// ==========================================================================
// 1. INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  checkAuthStatus();
  setupEventListeners();
  updateAgeBadge();
  updateBmiBadge();
  updateHba1cBadge();
  updateGlucoseBadge();
});

function setupEventListeners() {
  // Mobile sidebar toggle click outside to close
  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.querySelector('.btn-sidebar-toggle');
    if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
}

// ==========================================================================
// 2. AUTHENTICATION & SESSION
// ==========================================================================
async function checkAuthStatus() {
  try {
    const res = await fetch('/api/auth/status');
    const data = await res.json();
    if (data.authenticated && data.user) {
      setAuthenticatedUser(data.user);
    } else {
      // Check localStorage for demo remember me
      const savedUser = localStorage.getItem('diabetescare_user');
      if (savedUser) {
        setAuthenticatedUser(JSON.parse(savedUser));
      } else {
        showAuthView();
      }
    }
  } catch (err) {
    console.error('Auth check error:', err);
    showAuthView();
  }
}

function showAuthView() {
  document.getElementById('auth-view').style.display = 'flex';
  document.getElementById('app-view').style.display = 'none';
}

function showAppView() {
  document.getElementById('auth-view').style.display = 'none';
  document.getElementById('app-view').style.display = 'flex';
  loadInitialAppData();
}

function fillDemoCredentials(email, pwd) {
  document.getElementById('login-email').value = email;
  document.getElementById('login-password').value = pwd;
  const alertEl = document.getElementById('login-alert');
  if (alertEl) alertEl.style.display = 'none';
}

function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const remember = document.getElementById('remember-me').checked;
  const alertEl = document.getElementById('login-alert');
  const btn = document.getElementById('btn-login-submit');

  alertEl.style.display = 'none';
  btn.querySelector('.btn-text').style.display = 'none';
  btn.querySelector('.btn-loader').style.display = 'inline-block';
  btn.disabled = true;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (data.success) {
      if (remember) {
        localStorage.setItem('diabetescare_user', JSON.stringify(data.user));
      }
      setAuthenticatedUser(data.user);
      showToast('Welcome back, ' + data.user.name, 'success');
    } else {
      alertEl.textContent = data.message || 'Login failed. Please check your credentials.';
      alertEl.style.display = 'flex';
    }
  } catch (err) {
    alertEl.textContent = 'Server connection error. Please try again.';
    alertEl.style.display = 'flex';
  } finally {
    btn.querySelector('.btn-text').style.display = 'inline-block';
    btn.querySelector('.btn-loader').style.display = 'none';
    btn.disabled = false;
  }
}

function setAuthenticatedUser(user) {
  state.user = user;
  document.getElementById('user-display-name').textContent = user.name || 'Practitioner';
  document.getElementById('user-display-role').textContent = user.role || 'Clinician';
  document.getElementById('dash-greeting-name').textContent = user.name ? user.name.split(' ')[0] : 'Doctor';

  // Initials
  const initials = (user.name || 'Dr')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  document.getElementById('user-avatar-initials').textContent = initials;

  showAppView();
}

async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {}
  localStorage.removeItem('diabetescare_user');
  state.user = null;
  showAuthView();
  showToast('Logged out successfully', 'info');
}

// ==========================================================================
// 3. NAVIGATION & APP DATA LOADING
// ==========================================================================
function switchTab(tabId) {
  state.activeTab = tabId;

  // Update Nav links
  document.querySelectorAll('.sidebar-nav .nav-link').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeNavBtn = document.getElementById(`nav-${tabId}`);
  if (activeNavBtn) activeNavBtn.classList.add('active');

  // Update Views
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });
  const activePane = document.getElementById(`tab-${tabId}`);
  if (activePane) activePane.classList.add('active');

  // Update Title
  const titles = {
    dashboard: 'Dashboard Overview',
    predict: 'Diabetes Risk Prediction',
    history: 'Prediction History',
    performance: 'Model Performance & Benchmarks',
    about: 'About & Methodology'
  };
  document.getElementById('current-page-title').textContent = titles[tabId] || 'Dashboard';

  // Resize charts if switching to tabs containing charts
  if (tabId === 'dashboard' && state.charts.dashModelChart) {
    setTimeout(() => state.charts.dashModelChart.resize(), 100);
  } else if (tabId === 'performance' && state.charts.allModelsChart) {
    setTimeout(() => state.charts.allModelsChart.resize(), 100);
  }

  // Close mobile sidebar if open
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('open');
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.toggle('open');
}

async function loadInitialAppData() {
  await Promise.all([
    fetchSamples(),
    fetchMetrics(),
    fetchHistory()
  ]);
}

// ==========================================================================
// 4. SAMPLE PRESETS LOADER
// ==========================================================================
async function fetchSamples() {
  try {
    const res = await fetch('/api/samples');
    const data = await res.json();
    if (data.success && data.samples) {
      state.samples = data.samples;
      renderDashboardPresets(data.samples);
    }
  } catch (err) {
    console.error('Error fetching samples:', err);
  }
}

function renderDashboardPresets(samples) {
  const container = document.getElementById('dashboard-preset-container');
  if (!container) return;

  const colorMap = {
    'Low Risk': 'var(--accent-emerald)',
    'Moderate Risk': 'var(--accent-amber)',
    'High Risk': 'var(--accent-rose)'
  };

  container.innerHTML = samples.map(s => `
    <div class="quick-preset-item" onclick="loadSamplePreset('${s.id}')">
      <div>
        <span class="quick-preset-title">${s.title}</span>
        <span class="quick-preset-desc">Age ${s.age}, HbA1c ${s.HbA1c_level}%, Glucose ${s.blood_glucose_level} mg/dL</span>
      </div>
      <span class="field-badge" style="color: ${colorMap[s.badge] || '#06b6d4'}; border: 1px solid ${colorMap[s.badge] || '#06b6d4'};">
        ${s.badge}
      </span>
    </div>
  `).join('');
}

function loadSamplePreset(sampleId) {
  const sample = state.samples.find(s => s.id === sampleId);
  if (!sample) return;

  switchTab('predict');

  document.getElementById('input-gender').value = sample.gender;
  document.getElementById('input-age').value = sample.age;
  document.getElementById('input-smoking').value = sample.smoking_history;
  document.getElementById('input-bmi').value = sample.bmi;
  document.getElementById('input-hba1c').value = sample.HbA1c_level;
  document.getElementById('input-glucose').value = sample.blood_glucose_level;

  if (sample.hypertension === 1) {
    document.getElementById('ht-yes').checked = true;
  } else {
    document.getElementById('ht-no').checked = true;
  }

  if (sample.heart_disease === 1) {
    document.getElementById('hd-yes').checked = true;
  } else {
    document.getElementById('hd-no').checked = true;
  }

  updateAgeBadge();
  updateBmiBadge();
  updateHba1cBadge();
  updateGlucoseBadge();

  showToast(`Loaded preset: ${sample.title}`, 'info');
}

// ==========================================================================
// 5. REAL-TIME FORM BADGES & VALIDATION
// ==========================================================================
function updateAgeBadge() {
  const age = parseFloat(document.getElementById('input-age').value) || 0;
  const badge = document.getElementById('age-badge');
  if (age < 18) {
    badge.textContent = 'Pediatric (<18)';
    badge.style.color = '#38bdf8';
  } else if (age < 60) {
    badge.textContent = 'Adult (18-59)';
    badge.style.color = '#34d399';
  } else {
    badge.textContent = 'Senior (60+)';
    badge.style.color = '#fbbf24';
  }
}

function updateBmiBadge() {
  const bmi = parseFloat(document.getElementById('input-bmi').value) || 0;
  const badge = document.getElementById('bmi-badge');
  if (bmi < 18.5) {
    badge.textContent = 'Underweight';
    badge.style.color = '#38bdf8';
  } else if (bmi <= 24.9) {
    badge.textContent = 'Normal (18.5-24.9)';
    badge.style.color = '#34d399';
  } else if (bmi <= 29.9) {
    badge.textContent = 'Overweight (25-29.9)';
    badge.style.color = '#fbbf24';
  } else {
    badge.textContent = 'Obese (≥30)';
    badge.style.color = '#f87171';
  }
}

function updateHba1cBadge() {
  const val = parseFloat(document.getElementById('input-hba1c').value) || 0;
  const badge = document.getElementById('hba1c-badge');
  if (val < 5.7) {
    badge.textContent = 'Normal (<5.7%)';
    badge.style.color = '#34d399';
  } else if (val <= 6.4) {
    badge.textContent = 'Prediabetes (5.7-6.4%)';
    badge.style.color = '#fbbf24';
  } else {
    badge.textContent = 'Diabetic (≥6.5%)';
    badge.style.color = '#f87171';
  }
}

function updateGlucoseBadge() {
  const val = parseFloat(document.getElementById('input-glucose').value) || 0;
  const badge = document.getElementById('glucose-badge');
  if (val < 100) {
    badge.textContent = 'Normal (<100)';
    badge.style.color = '#34d399';
  } else if (val <= 199) {
    badge.textContent = 'Elevated (100-199)';
    badge.style.color = '#fbbf24';
  } else {
    badge.textContent = 'High Glucose (≥200)';
    badge.style.color = '#f87171';
  }
}

function resetPredictionForm() {
  document.getElementById('diabetes-form').reset();
  document.getElementById('ht-no').checked = true;
  document.getElementById('hd-no').checked = true;
  document.getElementById('input-age').value = 45;
  document.getElementById('input-bmi').value = 27.32;
  document.getElementById('input-hba1c').value = 5.8;
  document.getElementById('input-glucose').value = 130;

  updateAgeBadge();
  updateBmiBadge();
  updateHba1cBadge();
  updateGlucoseBadge();

  document.getElementById('result-placeholder').style.display = 'block';
  document.getElementById('result-active-card').style.display = 'none';
  const alertEl = document.getElementById('predict-form-alert');
  if (alertEl) alertEl.style.display = 'none';
}

// ==========================================================================
// 6. RUN ML PREDICTION (SUBMIT TO /api/predict)
// ==========================================================================
async function handlePredictionSubmit(e) {
  e.preventDefault();
  const alertEl = document.getElementById('predict-form-alert');
  const btn = document.getElementById('btn-predict-submit');

  alertEl.style.display = 'none';

  // Gather parameters
  const payload = {
    gender: document.getElementById('input-gender').value,
    age: parseFloat(document.getElementById('input-age').value),
    hypertension: parseInt(document.querySelector('input[name="hypertension"]:checked').value),
    heart_disease: parseInt(document.querySelector('input[name="heart_disease"]:checked').value),
    smoking_history: document.getElementById('input-smoking').value,
    bmi: parseFloat(document.getElementById('input-bmi').value),
    HbA1c_level: parseFloat(document.getElementById('input-hba1c').value),
    blood_glucose_level: parseFloat(document.getElementById('input-glucose').value)
  };

  btn.querySelector('.btn-text').style.display = 'none';
  btn.querySelector('.btn-loader').style.display = 'inline-block';
  btn.disabled = true;

  try {
    const res = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success && data.result) {
      displayPredictionResult(data.result);
      fetchHistory(); // Refresh history
      showToast(`Prediction complete: ${data.result.label}`, 'success');
    } else {
      alertEl.textContent = data.error || 'Prediction calculation error.';
      alertEl.style.display = 'flex';
    }
  } catch (err) {
    alertEl.textContent = 'Failed to connect to ML prediction backend: ' + err.message;
    alertEl.style.display = 'flex';
  } finally {
    btn.querySelector('.btn-text').style.display = 'inline-block';
    btn.querySelector('.btn-loader').style.display = 'none';
    btn.disabled = false;
  }
}

function displayPredictionResult(res) {
  document.getElementById('result-placeholder').style.display = 'none';
  const resultCard = document.getElementById('result-active-card');
  resultCard.style.display = 'block';

  const isDiabetic = res.prediction === 1;
  const banner = document.getElementById('result-banner-box');
  const icon = document.getElementById('result-status-icon');
  const labelText = document.getElementById('result-label-text');
  const riskTag = document.getElementById('result-risk-tag');
  const probText = document.getElementById('result-prob-text');
  const gaugeFill = document.getElementById('result-gauge-fill');
  const timestampEl = document.getElementById('result-timestamp');
  const modelNameEl = document.getElementById('result-model-name');

  labelText.textContent = res.label;
  timestampEl.textContent = res.timestamp;
  modelNameEl.textContent = res.model_used || 'SVC';
  probText.textContent = `${res.probability}%`;
  gaugeFill.style.width = `${Math.min(Math.max(res.probability, 4), 100)}%`;

  if (isDiabetic) {
    banner.className = 'result-banner banner-diabetic';
    icon.className = 'result-badge-icon icon-badge-diabetic';
    icon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
    riskTag.className = 'result-risk-tag tag-red';
    riskTag.textContent = res.risk_category || 'High Risk Profile';
    gaugeFill.style.background = 'var(--gradient-danger)';
  } else {
    banner.className = 'result-banner banner-nondiabetic';
    icon.className = 'result-badge-icon icon-badge-nondiabetic';
    icon.innerHTML = '<i class="fa-solid fa-check"></i>';
    
    if (res.risk_category === 'Moderate Risk') {
      riskTag.className = 'result-risk-tag tag-amber';
      riskTag.textContent = 'Moderate / Prediabetic Risk';
      gaugeFill.style.background = 'var(--gradient-warning)';
    } else {
      riskTag.className = 'result-risk-tag tag-green';
      riskTag.textContent = 'Low Risk Profile';
      gaugeFill.style.background = 'var(--gradient-success)';
    }
  }

  // Populate Parameter Breakdown Summary
  const p = res.normalized_parameters;
  const paramsGrid = document.getElementById('result-params-grid');
  paramsGrid.innerHTML = `
    <div class="summary-param-item">
      <span class="summary-param-name">Gender / Age</span>
      <span class="summary-param-val">${p.gender}, ${p.age} yrs</span>
    </div>
    <div class="summary-param-item">
      <span class="summary-param-name">BMI Index</span>
      <span class="summary-param-val">${p.bmi} kg/m²</span>
    </div>
    <div class="summary-param-item">
      <span class="summary-param-name">HbA1c Level</span>
      <span class="summary-param-val" style="color: ${p.HbA1c_level >= 6.5 ? '#fb7185' : '#34d399'};">${p.HbA1c_level}%</span>
    </div>
    <div class="summary-param-item">
      <span class="summary-param-name">Blood Glucose</span>
      <span class="summary-param-val" style="color: ${p.blood_glucose_level >= 200 ? '#fb7185' : '#34d399'};">${p.blood_glucose_level} mg/dL</span>
    </div>
    <div class="summary-param-item">
      <span class="summary-param-name">Hypertension</span>
      <span class="summary-param-val">${p.hypertension === 1 ? 'Yes' : 'No'}</span>
    </div>
    <div class="summary-param-item">
      <span class="summary-param-name">Smoking Status</span>
      <span class="summary-param-val">${p.smoking_history}</span>
    </div>
  `;

  // Render Risk Factors
  const factorsContainer = document.getElementById('result-risk-factors-container');
  if (res.risk_factors && res.risk_factors.length > 0) {
    factorsContainer.innerHTML = `
      <div class="result-section-title"><i class="fa-solid fa-flag"></i> Detected Clinical Risk Indicators:</div>
      ${res.risk_factors.map(f => `
        <div class="risk-factor-badge">
          <i class="fa-solid fa-circle-exclamation"></i>
          <span>${f}</span>
        </div>
      `).join('')}
    `;
  } else {
    factorsContainer.innerHTML = `
      <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); color: #34d399; padding: 0.6rem 1rem; border-radius: var(--radius-sm); font-size: 0.825rem; display: flex; align-items: center; gap: 0.5rem;">
        <i class="fa-solid fa-circle-check"></i>
        <span>No high-risk biomarker elevations detected in submitted profile.</span>
      </div>
    `;
  }
}

// ==========================================================================
// 7. MODEL PERFORMANCE & METRICS
// ==========================================================================
async function fetchMetrics(showToastNotification = false) {
  try {
    const res = await fetch('/api/metrics');
    const data = await res.json();
    if (data.success && data.data) {
      state.metrics = data.data;
      updateMetricsUI(data.data);
      if (showToastNotification) {
        showToast('ML metrics refreshed successfully', 'success');
      }
    }
  } catch (err) {
    console.error('Error fetching metrics:', err);
  }
}

function updateMetricsUI(data) {
  const m = data.metrics || {};
  const s = data.dataset_stats || {};

  // Dashboard KPI
  const svcTestPct = (m.svc_test_accuracy * 100).toFixed(2);
  const svcTrainPct = (m.svc_train_accuracy * 100).toFixed(2);
  const rfPct = (m.random_forest_accuracy * 100).toFixed(2);

  document.getElementById('dash-svc-accuracy').textContent = `${svcTestPct}%`;
  document.getElementById('dash-training-rows').textContent = s.total_rows_clean ? s.total_rows_clean.toLocaleString() : '96,146';
  document.getElementById('topbar-dataset-count').innerHTML = `<i class="fa-solid fa-database"></i> Dataset: ${s.total_rows_clean ? s.total_rows_clean.toLocaleString() : '100,000'} Records`;

  // Performance Tab KPI
  document.getElementById('perf-svc-test').textContent = `${svcTestPct}%`;
  document.getElementById('perf-svc-train').textContent = `${svcTrainPct}%`;
  document.getElementById('perf-rf-acc').textContent = `${rfPct}%`;
  document.getElementById('perf-lr-r2').textContent = m.linear_regression_r2 ? m.linear_regression_r2.toFixed(4) : '0.3642';

  // Confusion Matrix
  if (m.confusion_matrix && m.confusion_matrix.length === 2) {
    const cm = m.confusion_matrix;
    document.getElementById('cm-tn-val').textContent = cm[0][0].toLocaleString();
    document.getElementById('cm-fp-val').textContent = cm[0][1].toLocaleString();
    document.getElementById('cm-fn-val').textContent = cm[1][0].toLocaleString();
    document.getElementById('cm-tp-val').textContent = cm[1][1].toLocaleString();
  }

  // Classification Report Table
  renderClassificationReport(m.classification_report);

  // Render Charts
  renderModelCharts(m);
}

function renderClassificationReport(report) {
  const tbody = document.getElementById('classification-report-tbody');
  if (!tbody || !report) return;

  const rows = [
    { label: 'Class 0 (Non-Diabetic)', key: '0' },
    { label: 'Class 1 (Diabetic)', key: '1' },
    { label: 'Macro Average', key: 'macro avg' },
    { label: 'Weighted Average', key: 'weighted avg' }
  ];

  tbody.innerHTML = rows.map(r => {
    const item = report[r.key];
    if (!item) return '';
    return `
      <tr>
        <td><strong>${r.label}</strong></td>
        <td class="font-mono text-cyan">${(item.precision * 100).toFixed(2)}%</td>
        <td class="font-mono text-emerald">${(item.recall * 100).toFixed(2)}%</td>
        <td class="font-mono text-purple">${(item['f1-score'] * 100).toFixed(2)}%</td>
        <td class="font-mono text-muted">${item.support.toLocaleString()}</td>
      </tr>
    `;
  }).join('');
}

function renderModelCharts(m) {
  const modelLabels = [
    'SVC',
    'Random Forest',
    'KNN',
    'Logistic Reg.',
    'Decision Tree',
    'Naive Bayes'
  ];

  const modelScores = [
    (m.svc_test_accuracy * 100),
    (m.random_forest_accuracy * 100),
    (m.knn_accuracy * 100),
    (m.logistic_regression_accuracy * 100),
    (m.decision_tree_accuracy * 100),
    (m.nb_accuracy * 100)
  ];

  // 1. Dashboard Mini Chart
  const dashCtx = document.getElementById('dashModelChart');
  if (dashCtx) {
    if (state.charts.dashModelChart) state.charts.dashModelChart.destroy();
    state.charts.dashModelChart = new Chart(dashCtx, {
      type: 'bar',
      data: {
        labels: modelLabels,
        datasets: [{
          label: 'Accuracy (%)',
          data: modelScores,
          backgroundColor: [
            'rgba(6, 182, 212, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(244, 63, 94, 0.8)'
          ],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Accuracy: ${ctx.raw.toFixed(2)}%`
            }
          }
        },
        scales: {
          y: {
            min: 80,
            max: 100,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8', callback: v => v + '%' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 11 } }
          }
        }
      }
    });
  }

  // 2. Performance Tab Detailed Chart
  const allCtx = document.getElementById('allModelsChart');
  if (allCtx) {
    if (state.charts.allModelsChart) state.charts.allModelsChart.destroy();
    state.charts.allModelsChart = new Chart(allCtx, {
      type: 'bar',
      data: {
        labels: modelLabels,
        datasets: [{
          label: 'Accuracy (%)',
          data: modelScores,
          backgroundColor: [
            'rgba(6, 182, 212, 0.85)',
            'rgba(16, 185, 129, 0.85)',
            'rgba(139, 92, 246, 0.85)',
            'rgba(59, 130, 246, 0.85)',
            'rgba(245, 158, 11, 0.85)',
            'rgba(244, 63, 94, 0.85)'
          ],
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Accuracy: ${ctx.raw.toFixed(2)}%`
            }
          }
        },
        scales: {
          y: {
            min: 80,
            max: 100,
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            ticks: { color: '#cbd5e1', font: { size: 12 }, callback: v => v + '%' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#cbd5e1', font: { size: 12, weight: 'bold' } }
          }
        }
      }
    });
  }
}

// ==========================================================================
// 8. PREDICTION HISTORY MANAGEMENT
// ==========================================================================
async function fetchHistory() {
  try {
    const res = await fetch('/api/history');
    const data = await res.json();
    if (data.success && data.history) {
      state.history = data.history;
      renderHistoryTables(data.history);
      updateHistoryStats(data.history);
    }
  } catch (err) {
    console.error('Error fetching history:', err);
  }
}

function updateHistoryStats(history) {
  const total = history.length;
  const diabeticCount = history.filter(h => h.prediction === 1).length;
  const nonDiabeticCount = total - diabeticCount;

  document.getElementById('dash-total-predictions').textContent = total;
  document.getElementById('dash-diabetic-count').textContent = diabeticCount;
  document.getElementById('sidebar-history-count').textContent = total;

  const countAll = document.getElementById('count-all');
  const countNon = document.getElementById('count-nondiabetic');
  const countDia = document.getElementById('count-diabetic');
  if (countAll) countAll.textContent = total;
  if (countNon) countNon.textContent = nonDiabeticCount;
  if (countDia) countDia.textContent = diabeticCount;
}

function renderHistoryTables(history) {
  // 1. Dashboard Recent Table (top 5)
  const recentTbody = document.getElementById('dash-recent-tbody');
  if (recentTbody) {
    if (history.length === 0) {
      recentTbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted py-4">
            <i class="fa-regular fa-folder-open"></i> No predictions yet. Click "Start New Prediction" to assess a patient.
          </td>
        </tr>
      `;
    } else {
      const top5 = history.slice(0, 5);
      recentTbody.innerHTML = top5.map(item => {
        const inp = item.inputs || {};
        const isDiabetic = item.prediction === 1;
        return `
          <tr>
            <td class="text-muted"><i class="fa-regular fa-clock"></i> ${item.timestamp.split(' ')[1] || item.timestamp}</td>
            <td><strong>${inp.gender || '-'}, ${inp.age || '-'}y</strong></td>
            <td>${inp.bmi || '-'}</td>
            <td><strong style="color: ${inp.HbA1c_level >= 6.5 ? '#fb7185' : '#34d399'};">${inp.HbA1c_level}%</strong></td>
            <td>${inp.blood_glucose_level} mg/dL</td>
            <td>
              <span class="badge-outcome ${isDiabetic ? 'badge-diabetic' : 'badge-nondiabetic'}">
                <i class="fa-solid ${isDiabetic ? 'fa-triangle-exclamation' : 'fa-check'}"></i>
                ${item.label}
              </span>
            </td>
            <td>
              <span class="field-badge" style="color: ${item.risk_color || '#06b6d4'}; border: 1px solid ${item.risk_color || '#06b6d4'};">
                ${item.risk_category || 'Assessment'}
              </span>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // 2. Full History Table
  filterHistory();
}

function setHistoryFilter(filter, el) {
  state.historyFilter = filter;
  document.querySelectorAll('.filter-pills .filter-pill').forEach(p => p.classList.remove('active'));
  if (el) el.classList.add('active');
  filterHistory();
}

function filterHistory() {
  const search = (document.getElementById('history-search')?.value || '').toLowerCase();
  const filter = state.historyFilter;
  const tbody = document.getElementById('history-tbody');
  if (!tbody) return;

  const filtered = state.history.filter(item => {
    // Label filter
    if (filter === 'diabetic' && item.prediction !== 1) return false;
    if (filter === 'non-diabetic' && item.prediction !== 0) return false;

    // Search query
    if (search) {
      const inp = item.inputs || {};
      const fullStr = `${item.label} ${inp.gender} ${inp.age} ${inp.smoking_history} ${inp.bmi} ${inp.HbA1c_level} ${inp.blood_glucose_level}`.toLowerCase();
      if (!fullStr.includes(search)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="12" class="text-center text-muted py-5">
          <i class="fa-regular fa-folder-open"></i> No records match the search filter.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const inp = item.inputs || {};
    const isDiabetic = item.prediction === 1;
    return `
      <tr>
        <td class="text-muted"><small>${item.timestamp}</small></td>
        <td><strong>${inp.gender}</strong></td>
        <td>${inp.age}</td>
        <td>${inp.hypertension === 1 ? '<span class="text-rose">Yes</span>' : 'No'}</td>
        <td>${inp.heart_disease === 1 ? '<span class="text-rose">Yes</span>' : 'No'}</td>
        <td><small class="text-muted">${inp.smoking_history}</small></td>
        <td>${inp.bmi}</td>
        <td><strong style="color: ${inp.HbA1c_level >= 6.5 ? '#fb7185' : '#34d399'};">${inp.HbA1c_level}%</strong></td>
        <td>${inp.blood_glucose_level}</td>
        <td>
          <span class="badge-outcome ${isDiabetic ? 'badge-diabetic' : 'badge-nondiabetic'}">
            <i class="fa-solid ${isDiabetic ? 'fa-triangle-exclamation' : 'fa-check'}"></i>
            ${item.label}
          </span>
        </td>
        <td>
          <span class="field-badge" style="color: ${item.risk_color || '#06b6d4'}; border: 1px solid ${item.risk_color || '#06b6d4'};">
            ${item.risk_category || 'Evaluated'}
          </span>
        </td>
        <td><small class="text-muted">${item.model_used || 'SVC'}</small></td>
      </tr>
    `;
  }).join('');
}

async function clearAllHistory() {
  if (!confirm('Are you sure you want to clear all prediction history records?')) return;

  try {
    const res = await fetch('/api/history', { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      state.history = [];
      renderHistoryTables([]);
      updateHistoryStats([]);
      showToast('Prediction history cleared', 'info');
    }
  } catch (err) {
    showToast('Failed to clear history: ' + err.message, 'error');
  }
}

// ==========================================================================
// 9. TOAST NOTIFICATIONS
// ==========================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = {
    success: '<i class="fa-solid fa-circle-check text-emerald"></i>',
    error: '<i class="fa-solid fa-circle-xmark text-rose"></i>',
    info: '<i class="fa-solid fa-circle-info text-cyan"></i>'
  };

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `${icons[type] || icons.info} <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
