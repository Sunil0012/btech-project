import pandas as pd
import numpy as np
import math
import time
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss, roc_auc_score, accuracy_score

print("=== ASSISTments 2012-2013 Model Comparison (DARS, Glicko-2, Elo) ===")

# 1. Load Data
start_time = time.time()
csv_path = r'C:\Users\sunil\Downloads\btech-project\2012-2013-data-with-predictions-4-final.csv'

print("Loading essential columns...")
# Load only columns needed to save memory and time
cols = ['user_id', 'problem_id', 'correct', 'overlap_time', 'start_time', 'hint_count', 'attempt_count', 'assignment_id']
df = pd.read_csv(csv_path, usecols=cols)
print(f"Loaded {len(df):,} rows in {time.time() - start_time:.2f} seconds.")

# 2. Preprocess & Clean
print("Cleaning and sorting data...")
df = df[df['correct'].isin([0, 1])].copy()
df['correct'] = df['correct'].astype(int)
df['overlap_time'] = pd.to_numeric(df['overlap_time'], errors='coerce').fillna(22000.0) # Median fallback
df['hint_count'] = pd.to_numeric(df['hint_count'], errors='coerce').fillna(0).astype(int)
df['attempt_count'] = pd.to_numeric(df['attempt_count'], errors='coerce').fillna(1).astype(int)
df['start_time'] = pd.to_datetime(df['start_time'], errors='coerce')
df = df.dropna(subset=['start_time', 'user_id', 'problem_id']).copy()

# Sort chronologically to preserve temporal validity
df = df.sort_values('start_time').reset_index(drop=True)
print(f"Filtered to {len(df):,} valid attempts.")

# 3. Held-out Student Split (70/30)
unique_users = df['user_id'].unique()
np.random.seed(2026)
np.random.shuffle(unique_users)
train_user_count = int(0.70 * len(unique_users))
train_users = set(unique_users[:train_user_count])

df['split'] = np.where(df['user_id'].isin(train_users), 'train', 'test')
print(f"Training students: {train_user_count:,}, Testing students: {len(unique_users) - train_user_count:,}")

# 4. Helper Functions
def elo_expected(student_rating, problem_difficulty):
    return 1.0 / (1.0 + 10.0 ** ((problem_difficulty - student_rating) / 400.0))

def clip_prob(p):
    return np.clip(p, 1e-6, 1.0 - 1e-6)

# ECE Calculation Helper (10 bins)
def expected_calibration_error(y_true, y_prob, n_bins=10):
    y_true = np.array(y_true)
    y_prob = np.array(y_prob)
    bin_edges = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    for i in range(n_bins):
        bin_lower = bin_edges[i]
        bin_upper = bin_edges[i+1]
        in_bin = (y_prob >= bin_lower) & (y_prob < bin_upper)
        if i == n_bins - 1: # Include 1.0 in last bin
            in_bin = in_bin | (y_prob == bin_upper)
        prop_in_bin = np.mean(in_bin)
        if prop_in_bin > 0:
            accuracy_in_bin = np.mean(y_true[in_bin])
            avg_confidence_in_bin = np.mean(y_prob[in_bin])
            ece += prop_in_bin * np.abs(avg_confidence_in_bin - accuracy_in_bin)
    return ece

# Glicko-2 G function
def glicko2_g(phi):
    return 1.0 / math.sqrt(1.0 + 3.0 * (phi ** 2) / (math.pi ** 2))

# Glicko-2 Expectation
def glicko2_expected(mu, opp_mu, opp_phi):
    return 1.0 / (1.0 + math.exp(-glicko2_g(opp_phi) * (mu - opp_mu)))

# 5. Online Replay Simulation
print("Running joint online rating simulation...")
# We run simulation on ALL rows chronologically to dynamically update ratings.
# Rating dicts
elo_students = {}
elo_problems = {}

dars_students = {}
dars_problems = {}
student_streaks = {}
student_attempts = {}

# Glicko-2 States
glicko_mu = {}
glicko_phi = {}
glicko_vol = {}

# Outputs to store predictions
elo_probs = np.zeros(len(df))
glicko_probs = np.zeros(len(df))
dars_probs = np.zeros(len(df))

# Features for DARS+
rating_gaps = np.zeros(len(df))
streak_befores = np.zeros(len(df))
time_efficiencies = np.zeros(len(df))
hint_penalties = np.zeros(len(df))

# Joint Online Simulation Loop
loop_start = time.time()
for idx, row in enumerate(df.itertuples()):
    uid = row.user_id
    pid = row.problem_id
    s = row.correct
    overlap = row.overlap_time
    hints = row.hint_count
    
    # --- FIXED ELO ---
    r_s = elo_students.get(uid, 1500.0)
    d_p = elo_problems.get(pid, 1500.0)
    
    # Calculate expectation and store
    e_elo = elo_expected(r_s, d_p)
    elo_probs[idx] = e_elo
    
    # Joint update
    elo_students[uid] = r_s + 32.0 * (s - e_elo)
    elo_problems[pid] = d_p - 8.0 * (s - e_elo) # Problems evolve slower
    
    # --- GLICKO-2 ---
    # Retrieve Glicko mu and phi (scaled Elo values)
    # Scaled initial state: mu = 0, phi = 2.0148 (350 / 173.7178)
    mu_s = glicko_mu.get(uid, 0.0)
    phi_s = glicko_phi.get(uid, 2.0148)
    
    mu_p = glicko_mu.get(pid, 0.0) # Problem's mu derived from Elo
    phi_p = 0.4605 # Bounded item RD = 80 -> phi = 80/173.7178 = 0.4605
    
    # Expected success under Glicko-2
    e_glicko = glicko2_expected(mu_s, mu_p, phi_p)
    glicko_probs[idx] = e_glicko
    
    # Simple online Glicko-2 update approximation (standard Elo-Glicko hybrid)
    g_phi = glicko2_g(phi_p)
    variance_inv = (g_phi ** 2) * e_glicko * (1 - e_glicko)
    if variance_inv > 0:
        d_mu = (phi_s ** 2) / (1.0 + (phi_s ** 2) * variance_inv) * g_phi * (s - e_glicko)
        glicko_mu[uid] = mu_s + d_mu
        # Decaying uncertainty RD slightly after attempt
        phi_s_new = math.sqrt(phi_s ** 2 + 0.001) # Small volatility step
        glicko_phi[uid] = max(0.2, min(2.0148, phi_s_new - 0.05)) # Practice reduces uncertainty
    
    # --- DARS ---
    r_dars = dars_students.get(uid, 1500.0)
    d_dars = dars_problems.get(pid, 1500.0)
    streak = student_streaks.get(uid, 0)
    attempts = student_attempts.get(uid, 0)
    
    e_dars = elo_expected(r_dars, d_dars)
    dars_probs[idx] = e_dars
    
    # Performance quality P(q)
    tau = math.exp(-overlap / 30000.0) # Time efficiency (half-life of 20.8s)
    h_pen = min(1.0, hints / 5.0)      # Hint penalty
    
    if s == 1:
        p_q = 0.8 * tau + 0.2 * (1.0 - h_pen)
    else:
        p_q = 0.0
        
    # Bounded streak multiplier
    phi_k = 1.2 if abs(streak) >= 3 else 1.0
    
    # Dynamic K-factor (uncertainty decay with attempt count)
    k_s = max(8.0, 32.0 / (1.0 + 0.01 * attempts))
    
    # Update student rating
    dars_students[uid] = r_dars + k_s * phi_k * (p_q - e_dars)
    dars_problems[pid] = d_dars - 8.0 * (s - e_dars)
    
    # Store features for calibration
    rating_gaps[idx] = r_dars - d_dars
    streak_befores[idx] = streak
    time_efficiencies[idx] = tau
    hint_penalties[idx] = h_pen
    
    # Update student streaks and attempt count
    student_attempts[uid] = attempts + 1
    if s == 1:
        student_streaks[uid] = streak + 1 if streak >= 0 else 1
    else:
        student_streaks[uid] = streak - 1 if streak <= 0 else -1

print(f"Replay completed in {time.time() - loop_start:.2f} seconds.")

# Attach ratings to dataframe
df['elo_prob'] = elo_probs
df['glicko_prob'] = glicko_probs
df['dars_prob'] = dars_probs
df['rating_gap'] = rating_gaps
df['streak_before'] = streak_befores
df['time_efficiency'] = time_efficiencies
df['hint_penalty'] = hint_penalties

# 6. DARS+ Calibration Model Training
print("Training DARS+ calibrated model...")
train_mask = df['split'] == 'train'
test_mask = df['split'] == 'test'

# Feature Matrix
features = ['dars_prob', 'rating_gap', 'streak_before', 'time_efficiency', 'hint_penalty', 'attempt_count']
X_train = df.loc[train_mask, features].copy()
X_test = df.loc[test_mask, features].copy()

# Add logit of dars_prob
X_train['dars_logit'] = np.log(clip_prob(X_train['dars_prob']) / (1.0 - clip_prob(X_train['dars_prob'])))
X_test['dars_logit'] = np.log(clip_prob(X_test['dars_prob']) / (1.0 - clip_prob(X_test['dars_prob'])))

features_plus = ['dars_logit', 'rating_gap', 'streak_before', 'time_efficiency', 'hint_penalty']

y_train = df.loc[train_mask, 'correct'].values
y_test = df.loc[test_mask, 'correct'].values

clf = LogisticRegression(max_iter=1000, random_state=2026)
clf.fit(X_train[features_plus], y_train)

# Predict probabilities
df.loc[test_mask, 'dars_plus_prob'] = clf.predict_proba(X_test[features_plus])[:, 1]
df.loc[test_mask, 'static_prob'] = y_train.mean() # Global average baseline

print("DARS+ model coefficients:")
for feat, coef in zip(features_plus, clf.coef_[0]):
    print(f"  {feat}: {coef:.4f}")
print(f"  Intercept: {clf.intercept_[0]:.4f}")

# 7. Model Evaluation on Test Split (Held-out Students)
print("\nEvaluating all models on held-out test split...")
test_df = df[test_mask].copy()
y_true = test_df['correct'].values

models = {
    'Static Start': 'static_prob',
    'Fixed Elo K=32': 'elo_prob',
    'Glicko-2': 'glicko_prob',
    'DARS': 'dars_prob',
    'DARS+ Calibrated': 'dars_plus_prob'
}

results = []
for name, col in models.items():
    p = test_df[col].values
    brier = brier_score_loss(y_true, p)
    logloss = log_loss(y_true, clip_prob(p))
    auc = roc_auc_score(y_true, p)
    acc = accuracy_score(y_true, p >= 0.5)
    ece = expected_calibration_error(y_true, p, n_bins=10)
    
    results.append({
        'Model': name,
        'Brier Score': brier,
        'Log Loss': logloss,
        'Accuracy': acc,
        'ROC AUC': auc,
        'ECE (10 bins)': ece
    })

results_df = pd.DataFrame(results).sort_values('Brier Score')

print("\n=== BENCHMARK COMPARISON TABLE ===")
print(results_df.to_markdown(index=False, floatfmt=".4f"))

# Write the final results to CSV for reporting
results_df.to_csv("assistments_model_comparison_results.csv", index=False)
print("\nResults successfully saved to assistments_model_comparison_results.csv!")
