# 🚀 Quick Commands - STUDENT_PROGRESS_TRACKER

## ⚡ Start Using Right Now (Copy-Paste These)

### 1. Open & Run Notebook
```
# In VS Code:
1. File → Open File → STUDENT_PROGRESS_TRACKER.ipynb
2. Select Python Kernel (3.8+)
3. Run All Cells (Ctrl+Shift+Enter)
   OR Run Each Cell (Ctrl+Enter)
```

---

## 📊 Individual Cell Commands

### Run Just Imports
```python
# Cell 1 - Takes 2 seconds
# ✅ Should see: "All libraries imported successfully"
# If error → Kernel might need restart
```

### Initialize Configuration  
```python
# Cell 2 - Takes 1 second
# ✅ Should see: "Supabase URL loaded"
#                "Configuration loaded"
# If error → Check .env file exists
```

### Load Data (Demo or Real)
```python
# Cell 3 - Takes 3 seconds
# ✅ Should see: "Using DEMO data" OR test count
# If real data → Update STUDENT_ID first

# To use real data:
STUDENT_ID = "abc12345-1234-1234-1234-123456789def"
# Replace with your actual UUID
```

### View Dashboard
```python
# Cell 4 - Takes 5 seconds to render
# ✅ Should see: 4-panel interactive dashboard
#    - Score trend line
#    - Accuracy bar chart
#    - Questions summary
#    - Statistics
```

### Analyze Questions
```python
# Cell 5 - Takes 2 seconds
# ✅ Should see: Question performance analysis
#    - Struggling questions (0%)
#    - Strong questions (100%)
#    - Interactive horizontal bar chart
```

### Graph Visualization + Simulation
```python
# Cell 6 - Takes 5 seconds
# ✅ Should see: 
#    1. Network graph (nodes and edges)
#    2. Simulation output (20 questions)
#    3. Color-coded circles (green/red)
```

### Test History & Reviews
```python
# Cell 7 - Takes 2 seconds
# ✅ Should see:
#    1. Test history list
#    2. Detailed test review
#    3. Performance comparison chart
```

---

## 🔧 Troubleshooting Commands

### Issue: Import Error
```python
# Solution: Restart kernel and try again
# In notebook: Kernel → Restart Kernel
# Then: Run Cell 1
```

### Issue: No Data Found
```python
# Check your Student ID:
print(STUDENT_ID)  # Should be UUID format
# abc12345-1234-1234-1234-123456789def ✅
# 12345 ❌ (too short)

# Check .env file exists:
from pathlib import Path
env_file = Path.cwd() / ".env"
print(f"File exists: {env_file.exists()}")  # Should be True
```

### Issue: Blank Charts
```python
# Verify data loaded:
print(f"Tests loaded: {len(test_history)}")  # Should be 5+
print(f"Questions: {len(question_performance)}")  # Should be 100+

# If 0: Database not accessible, using demo data
# If >0: Data loaded successfully
```

### Issue: Slow Rendering
```python
# Normal - some charts are complex
# Typical times:
# - Dashboard: 3-5 seconds
# - Question analysis: 2-3 seconds  
# - Graph: 5-10 seconds (first time)
# - Test history: 2-3 seconds
```

---

## 📈 Interpret the Results

### Dashboard Metrics
```python
# Metrics to watch:
score_avg = test_history['score'].mean()
# Good: 70+, Average: 50-70, Needs work: <50

accuracy = (question_performance['correct'].sum() / 
            len(question_performance) * 100)
# Good: 70%+, Average: 50-70%, Needs work: <50%

trend = test_history['score'].iloc[-1] - test_history['score'].iloc[0]
# Positive: improving ✅
# Negative: declining ❌
# Flat: steady 📊
```

### Question Analysis  
```python
# Identify weak areas:
struggling = analysis_df[analysis_df['success_rate'] < 50]
print(f"Struggling with: {len(struggling)} questions")
for q in struggling.head(3):
    print(f"  - {q['question_id']}: {q['success_rate']}%")

# Plan to study these!
```

### Graph Colors
```python
# Green nodes = ✅ Correct answers (mastered)
# Red nodes = ❌ Wrong answers (focus here)
# Opacity: 50% initially → 100% when attempted
# Edges: Connect questions in test sequence
```

---

## 🎯 Weekly Workflow

### Monday - Initial Assessment
```python
# 1. Run all cells
# 2. Note current score/accuracy
# 3. Identify red nodes (weak areas)
# 4. Plan study focus for the week

# Command: Just run notebook, review dashboard
```

### Wednesday - Mid-Week Check
```python
# 1. Take a topic-wise test on weak areas
# 2. Update Student ID if needed
# 3. Re-run cells 3-7
# 4. See if accuracy improved on those topics

# Command: Re-run notebook, compare metrics
```

### Friday - Weekly Review
```python
# 1. Review full test history
# 2. Check performance trend
# 3. Update study plan for next week
# 4. Share insights with teacher

# Command: Run all cells, focus on cells 5-7
```

---

## 🔗 Connect Real Data

### Option A: Direct UUID Update
```python
# In Cell 3, change:
STUDENT_ID = "12efa469-0330-42e1-bc64-82bed3402ae8"  # Old

# To:
STUDENT_ID = "YOUR_ACTUAL_UUID_HERE"  # New

# Then run: Cell 3 → Cells 4-7
```

### Option B: Verify & Confirm
```python
# Before changing, verify the ID:
import requests
SUPABASE_URL = "https://your-project.supabase.co"
SUPABASE_KEY = "sb_public_..."

# Check if ID exists:
filter_str = f"user_id=eq.{STUDENT_ID}&limit=1"
# (Run in SQL console for quicker verification)
```

### Option C: Use JWT Token (If RLS Blocks Access)
```python
# In Cell 2, add:
SUPABASE_ACCESS_TOKEN = "your_jwt_token_here"

# This bypasses RLS policies
# Contact backend to get a valid JWT token
```

---

## 📊 Export Results

### Save Dashboard as Image
```python
# After running Cell 4:
fig.write_image("dashboard.png")  # Requires kaleido
fig.write_html("dashboard.html")  # Better option
```

### Export Analysis as CSV
```python
# After running Cell 5:
question_analysis.to_csv("analysis.csv", index=False)
print("✅ Saved to analysis.csv")
```

### Export Test History
```python
# After running Cell 7:
test_history.to_csv("test_history.csv", index=False)
print("✅ Saved to test_history.csv")

# Share with teacher/mentor:
# - Shows all test scores
# - Accuracy trends
# - Test types taken
```

---

## 🎓 Teaching Integration

### Share with Teacher
```python
# Save and email:
fig.write_html("my_progress.html")  # Interactive

# Show these visuals:
# 1. Dashboard - overall progress
# 2. Question analysis - weak areas
# 3. Test history - detailed review

# Teacher can:
# - See your improvement
# - Identify gaps
# - Suggest focus areas
```

### Generate Weekly Report
```python
# After each week:
report = f"""
WEEKLY PROGRESS REPORT
Date: 2026-04-19

Overall Score: {test_history['score'].mean():.1f}/100
Accuracy: {accuracy:.1f}%
Tests Taken: {len(test_history)}

Top 3 Weak Areas:
{struggling.head(3).to_string()}

Top 3 Strong Areas:
{performing.tail(3).to_string()}

Trend: {'↗️ IMPROVING' if trend > 0 else '↘️ DECLINING' if trend < 0 else '→ STABLE'}
"""

# Print or save
print(report)
```

---

## ⚡ Keyboard Shortcuts

```python
# In Jupyter Notebook:
Ctrl + Enter          → Run current cell
Shift + Enter         → Run and move to next
Ctrl + Shift + Enter  → Run all cells
Shift + M             → Merge cells
K                     → Delete cell
Z                     → Undo
Y                     → Change to code cell
M                     → Change to markdown cell
```

---

## 🚀 Pro Tips

### Tip 1: Reuse Data
```python
# Don't re-fetch if data hasn't changed
# Test history is cached in memory
# Just re-run visualization cells (4-7)
```

### Tip 2: Focus on Red Nodes
```python
# In the graph visualization:
# Red nodes = Questions to study
# Print them:
weak_questions = [
    node for node in G.nodes() 
    if not G.nodes[node]['correct']
]
print(weak_questions)
```

### Tip 3: Track Time Efficiency
```python
# Identify questions you spend too long on:
slow_questions = (
    question_performance[
        question_performance['time_spent_seconds'] > 120
    ]
)
print(f"Taking too long: {len(slow_questions)} questions")
```

### Tip 4: Rapid Guess Detection
```python
# Questions you answered too quickly:
rapid_guesses = (
    question_performance[
        question_performance['rapid_guess'] == True
    ]
)
print(f"⚡ Rapid guesses: {len(rapid_guesses)}")
```

---

## 📞 Support

### If Stuck
```python
# 1. Check error message
# 2. Look at relevant troubleshooting section above
# 3. Restart kernel if unsure
# 4. Re-run cells 1-3
# 5. Try again

# Most common: Just restart kernel!
```

### Documentation Files
```
Read these in order:
1. QUICK_START_VISUAL.md (start here)
2. NOTEBOOK_SETUP_GUIDE.md (detailed setup)
3. PROGRESS_TRACKER_COMPLETE.md (overview)
4. DATABASE_ACCESS_RESOLUTION.md (if DB issues)
5. DATA_REQUIREMENTS.md (data format)
```

---

## ✅ Checklist Before First Run

- [ ] Notebook file exists: `STUDENT_PROGRESS_TRACKER.ipynb`
- [ ] Python 3.8+ installed
- [ ] VS Code Jupyter extension installed
- [ ] `.env` file exists with Supabase credentials
- [ ] Kernel selected and ready
- [ ] Ready to run cells 1-7 in order

---

## 🎯 Success Signals

### ✅ Things You Should See

```
Cell 1: ✅ "All libraries imported successfully"
Cell 2: ✅ "Supabase URL loaded"
        ✅ "Configuration loaded"  
Cell 3: ✅ "Using DEMO data (5 tests)"
        OR "Loaded 5 test attempts"
Cell 4: ✅ Dashboard with 4 charts
Cell 5: ✅ Question analysis output
        ✅ Bar chart visualization
Cell 6: ✅ Graph network visualization
        ✅ Simulation output
Cell 7: ✅ Test history list
        ✅ Performance chart
```

### ❌ If You See These

```
❌ Import Error → Restart kernel
❌ No data → Demo data should show
❌ Blank chart → Scroll down in notebook
❌ Connection error → Network issue, will retry
❌ RLS blocked → Demo data fallback active
```

---

**You're all set! Start with Cell 1. 🚀**

Last Updated: 2026-04-19
