# STUDENT_PROGRESS_TRACKER Notebook Guide

## Overview

The `STUDENT_PROGRESS_TRACKER.ipynb` Jupyter notebook provides comprehensive student progress tracking with interactive visualizations including:

- Student progress dashboard with score trends
- Question-by-question performance analysis
- Interactive graph visualization of test attempts
- Test history review system
- Performance comparison across test types

---

## Prerequisites

### Python Environment
- Python 3.8+
- Jupyter Notebook/Lab

### Required Packages
```bash
pip install pandas numpy matplotlib networkx plotly requests python-dotenv ipywidgets
```

### Supabase Setup
- Supabase project URL
- Supabase public/service role key
- Student's UUID (email or ID)

### Environment File
Create `.env` in project root:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_ACCESS_TOKEN=your-service-role-key  # Optional
STUDENT_ID=your-student-uuid-here
```

---

## Running the Notebook

### Step 1: Open Notebook
```bash
jupyter notebook STUDENT_PROGRESS_TRACKER.ipynb
# or
jupyter lab STUDENT_PROGRESS_TRACKER.ipynb
```

### Step 2: Configure Student
In **Section 2 - Configuration** cell:
- Set `STUDENT_ID` to a valid student UUID
- Leave `SUPABASE_ACCESS_TOKEN` blank to use public key
- Or set to service role key if you have it

### Step 3: Run All Cells
```
Kernel → Restart Kernel and Run All Cells
```

Or run cells in order (recommended first time):
1. Run Section 1 (imports)
2. Run Section 2 (configuration)
3. Run Section 3 (data loading)
4. Run Section 4 (dashboard)
5. Run Section 5 (question analysis)
6. Run Section 6 (graph visualization)
7. Run Section 7 (test history review)

---

## Notebook Sections

### Section 1: Imports
Loads required libraries:
- `pandas` - Data manipulation
- `numpy` - Numerical operations
- `matplotlib` - Static plots
- `networkx` - Graph creation
- `plotly` - Interactive visualizations
- `requests` - HTTP client
- `ipywidgets` - Interactive controls
- `python-dotenv` - Environment variables

### Section 2: Configuration
**Reads `.env` file and sets up Supabase connection**

**Variables:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Public or service role key
- `SUPABASE_ACCESS_TOKEN` - Optional token
- `STUDENT_ID` - Student UUID to analyze

**Functions:**
- `read_env_file()` - Reads and parses `.env`
- `fetch_from_supabase()` - Generic API client

**Example Configuration:**
```python
SUPABASE_URL = "https://xxxxx.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIs..."
STUDENT_ID = "550e8400-e29b-41d4-a716-446655440000"
```

### Section 3: Data Loading
**Loads student test history from Supabase**

**Functions:**
- `load_student_test_history(student_id, token)` - Queries test_history table
- `parse_review_payload(review_payload)` - Extracts question performance
- `extract_question_performance()` - Flattens to per-question rows

**Output DataFrame Columns:**
- `test_id` - Test session ID
- `question_id` - Question identifier
- `correct` - Boolean (was answer correct?)
- `time_spent_seconds` - Time on question
- `rapid_guess` - Boolean (rapid guess warning?)
- `test_type` - Type of test
- `completed_at` - When test was completed
- `score` - Test score
- `max_score` - Maximum possible score

**Loaded DataFrames:**
- `test_history_df` - All test sessions
- `question_perf_df` - Per-question performance

### Section 4: Progress Dashboard
**Creates interactive progress dashboard with 4 subplots**

**Visualizations:**

1. **Score Trend Over Time** (Line + Markers)
   - X-axis: Test date
   - Y-axis: Score
   - Shows improvement trend

2. **Accuracy by Test Type** (Bar Chart)
   - Compares accuracy across test types
   - Full mock vs topic-wise vs adaptive

3. **Pie Chart: Correct vs Wrong**
   - Overall performance distribution
   - Green: Correct, Red: Wrong

4. **Stacked Bar Chart**
   - Total Attempted vs Correct vs Wrong
   - Shows attempt coverage

**Metrics Displayed:**
- Total tests completed
- Average score
- Overall accuracy %
- Unique questions attempted
- Correct answers count

### Section 5: Question Analysis
**Analyzes performance for each question**

**Calculations:**
- Success rate = (correct_count / total_attempts) × 100
- Question difficulty (inverse of success rate)
- Most struggling questions (lowest success)
- Top performing questions (highest success)

**Visualization:**
- Horizontal bar chart
- Color scale: Red (struggling) → Yellow → Green (mastered)
- Shows top 10 worst and top 10 best questions

**Output:**
- Question IDs ranked by success rate
- Attempt frequency per question
- Time spent average per question

### Section 6: Graph Visualization
**Creates interactive network graph of test attempt progression**

**Graph Components:**

1. **Node Creation:**
   - Each question = node
   - Color: Green (#10b981) if correct, Red (#ef4444) if wrong
   - Size: 30 pixels
   - Opacity: 50% initially (animates to 100% during simulation)
   - Label: Question number

2. **Edges:**
   - Connects questions in order from same test
   - Light gray lines
   - Shows test progression flow

3. **Layout:**
   - Spring layout (force-directed)
   - k=2 (spacing factor)
   - iterations=50

4. **Interactive Features:**
   - Hover to see question ID, status, time spent
   - Pan and zoom
   - Click nodes to highlight connections

**Hover Information:**
```
Question ID: q_123
Status: ✅ Correct  (or ❌ Wrong)
Time Spent: 45 seconds
Rapid Guess: No
```

### Section 7: Test History Review
**Detailed test history and comparison tools**

**Functions:**

1. **`display_test_history(test_history_df)`**
   - Shows all tests with:
     - Test type
     - Score and max score
     - Accuracy %
     - Questions attempted
     - Violations
     - Timestamp
     - Review availability

2. **`review_specific_test(test_history_df, question_perf_df, test_index)`**
   - Deep dive into single test
   - Per-question breakdown
   - Shows correct/wrong for each
   - Time spent per question

3. **`compare_tests(test_history_df)`**
   - Side-by-side comparison
   - Score trend line
   - Accuracy trend line
   - Secondary Y-axis for accuracy

**Summary Statistics:**
- Highest score
- Lowest score
- Average score
- Accuracy trend
- Questions mastered
- Topics to focus on

---

## Output Examples

### Dashboard Metrics
```
Total Tests: 12
Average Score: 78.5
Overall Accuracy: 72.3%
Unique Questions Attempted: 234
Correct Answers: 169
```

### Question Performance
```
Top Struggling Questions:
  q_001: 20% success rate (5/25 attempts)
  q_002: 25% success rate (6/24 attempts)
  
Top Performing Questions:
  q_456: 95% success rate (19/20 attempts)
  q_789: 92% success rate (23/25 attempts)
```

### Graph Node Information (Hover)
```
Question ID: q_ga_001
Status: ✅ Correct
Time Spent: 32 seconds
Rapid Guess: No
```

---

## Customization

### Change Student
```python
# In Section 2, change:
STUDENT_ID = "new-student-uuid-here"
# Then re-run Section 3 onwards
```

### Filter by Test Type
```python
# In Section 3, after loading:
question_perf_df = question_perf_df[question_perf_df['test_type'] == 'full-mock']
```

### Change Date Range
```python
# In Section 3, after loading:
start_date = '2024-01-01'
end_date = '2024-03-31'
question_perf_df = question_perf_df[
    (question_perf_df['completed_at'] >= start_date) &
    (question_perf_df['completed_at'] <= end_date)
]
```

### Modify Graph Colors
```python
# In Section 6, change:
# Correct (green):
node_color = ['#10b981' if ...]  # Change this hex
# Wrong (red):
node_color = ['#ef4444' if ...]  # Or this
```

### Show Top N Questions
```python
# In Section 5:
# Change from top 10 to top 20:
analysis_df.nsmallest(20, 'success_rate')  # Struggling
analysis_df.nlargest(20, 'success_rate')   # Performing
```

---

## Troubleshooting

### Error: "No module named 'pandas'"
**Solution:**
```bash
pip install pandas numpy matplotlib networkx plotly requests python-dotenv
```

### Error: "SUPABASE_URL not found in .env"
**Solution:**
1. Create `.env` file in project root
2. Add: `SUPABASE_URL=https://...`
3. Restart kernel

### Error: "Student ID not found"
**Possible Causes:**
- Student UUID doesn't exist
- Typo in STUDENT_ID
- Student has no test history

**Solution:**
- Verify student UUID
- Check Supabase test_history table for this student

### Error: "Connection refused"
**Solution:**
- Check SUPABASE_URL is correct
- Verify internet connection
- Verify Supabase project is active

### Graph Shows No Nodes
**Causes:**
- No test history for student
- All tests have empty question_ids

**Solution:**
- Run a test first
- Verify review_payload is populated in database

### Dashboard Shows Errors
**Solution:**
1. Check Section 3 loaded data successfully
2. Verify test_history_df and question_perf_df are not empty
3. Try re-running all cells

---

## Interpreting Results

### Score Trend Chart
- **Upward trend:** Improvement over time ✓
- **Flat/downward:** Consistent or declining performance
- **Spikes:** Success on specific test attempts

### Question Analysis
- **Red zone (0-30%):** Critical topics to focus on
- **Yellow zone (30-70%):** Areas to practice
- **Green zone (70-100%):** Mastered topics

### Graph Visualization
- **Many green nodes:** Strong overall performance
- **Many red nodes:** More practice needed
- **Balanced mix:** Varied learning progress

### Accuracy by Test Type
- **Full Mock:** Most accurate (longer time)
- **Topic-wise:** Variable (depends on topic)
- **Adaptive:** Good indicator of actual ability

---

## Performance Metrics

### Large Datasets
- 1000 tests: ~2-5 seconds to load and process
- 5000 questions: ~10-15 seconds for full analysis
- Graph with 5000 nodes: ~30 seconds to render

### Optimization Tips
- Filter by date range before visualizing
- Use topic-wise subset for focused analysis
- Export data to CSV for external analysis

---

## Integration with Main App

### Review Payload Structure
The notebook expects `review_payload` in test_history to contain:
```json
{
  "question_ids": ["q1", "q2", ...],
  "answers": [...],
  ...
}
```

### Syncing Data
- Notebook reads live data from Supabase
- Refreshes whenever you rerun Section 3
- No local caching (always latest data)

### Real-time Updates
To see newest tests:
1. Rerun Section 3: Data Loading
2. Skip Sections 4-7
3. Check updated metrics

---

## Example Workflows

### Workflow 1: Monitor Weekly Progress
1. Run notebook every Monday
2. Check score trend
3. Identify struggling questions
4. Focus on red zone topics

### Workflow 2: Analyze Test Attempt
1. Set STUDENT_ID
2. Run to Section 7
3. Use `review_specific_test(index)`
4. Check per-question performance

### Workflow 3: Compare Two Students
1. Create second notebook with STUDENT_ID_2
2. Load both notebooks side-by-side
3. Compare dashboards
4. Compare question performance

### Workflow 4: Export Progress Report
```python
# After running all sections:
test_history_df.to_csv('student_test_history.csv')
question_perf_df.to_csv('question_performance.csv')
```

---

## Sharing Results

### Export Graph
```python
# In Section 6, after creating plotly figure:
fig.write_html('student_progress_graph.html')  # Share this file
```

### Export Dashboard
```python
# In Section 4, after creating subplots:
dashboard.write_html('student_dashboard.html')
```

### Create PDF Report
```bash
# Install wkhtmltopdf if needed
pip install pdfkit
python -c "import pdfkit; pdfkit.from_file('dashboard.html', 'report.pdf')"
```

---

## Advanced Features

### Custom Metrics
Add to notebook to calculate:
```python
# Time trend
avg_time_per_day = question_perf_df.groupby('completed_at')['time_spent_seconds'].mean()

# Accuracy by subject
accuracy_by_subject = question_perf_df.groupby('test_type')['correct'].mean()

# Learning rate (improvement rate)
daily_accuracy = test_history_df.groupby('completed_at')['score'].mean()
```

### Predictive Analysis
```python
# Simple trend prediction
from sklearn.linear_model import LinearRegression
# Predict next test score based on trend
```

### Recommendation Engine
```python
# Topics to focus on
struggling = analysis_df.nsmallest(5, 'success_rate')['question_id'].tolist()
# Get topics for these questions
# Recommend focused practice
```

---

## Support

- **Errors:** Check console output in notebook
- **Data issues:** Verify test history in Supabase dashboard
- **Performance:** Check network connection and system resources
- **Questions:** Review earlier sections for similar issues

---

**Last Updated:** April 2024  
**Version:** 1.0  
**Status:** Production Ready
