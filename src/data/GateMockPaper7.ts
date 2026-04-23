export const daMockPaper5Questions = [
  // ─────────────────────────────────────────────
  // GENERAL APTITUDE (Q1–Q10) | 1 mark | -0.33
  // ─────────────────────────────────────────────

  {
    id: "daMock5-q1",
    subjectId: "data-science-ai",
    topicId: "verbal-reasoning",
    question:
      "Choose the word that best fills the blank: The scientist's explanation was so ______ that even a child could understand it.",
    options: ["Abstruse", "Lucid", "Verbose", "Arcane"],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "'Lucid' means clear and easy to understand, which fits the context of a child being able to comprehend it.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q2",
    subjectId: "data-science-ai",
    topicId: "verbal-reasoning",
    question:
      "Read the passage: 'All managers in the company attended the training. Some managers are also engineers. All engineers passed the certification exam.' Which conclusion is definitely TRUE?",
    options: [
      "All managers passed the certification exam",
      "Some managers who are engineers passed the certification exam",
      "All engineers are managers",
      "No manager failed the certification exam",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Since some managers are engineers, and all engineers passed the exam, those manager-engineers definitely passed. We cannot conclude anything about non-engineer managers.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q3",
    subjectId: "data-science-ai",
    topicId: "verbal-reasoning",
    question:
      "Identify the correct sentence:",
    options: [
      "Neither the students nor the teacher were present.",
      "Neither the students nor the teacher was present.",
      "Neither the students nor the teacher are present.",
      "Neither the students nor the teacher have been present.",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "With 'neither...nor', the verb agrees with the subject closest to it. 'Teacher' is singular, so 'was' is correct.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q4",
    subjectId: "data-science-ai",
    topicId: "quantitative-aptitude",
    question:
      "A train 200 m long passes a pole in 10 seconds. How long will it take to pass a platform 300 m long?",
    options: ["15 s", "20 s", "25 s", "30 s"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "Speed = 200/10 = 20 m/s. Distance to cover = 200 + 300 = 500 m. Time = 500/20 = 25 s.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q5",
    subjectId: "data-science-ai",
    topicId: "quantitative-aptitude",
    question:
      "If the ratio of boys to girls in a class is 3:2 and there are 40 students in total, how many girls are there?",
    options: ["16", "24", "18", "20"],
    correctAnswer: 0,
    type: "mcq",
    explanation:
      "Girls = (2/5) × 40 = 16.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q6",
    subjectId: "data-science-ai",
    topicId: "quantitative-aptitude",
    question:
      "What is the next term in the series: 2, 6, 12, 20, 30, ___?",
    options: ["40", "42", "44", "46"],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Differences: 4, 6, 8, 10, 12. Next term = 30 + 12 = 42. Pattern: n(n+1).",
    difficulty: "medium",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q7",
    subjectId: "data-science-ai",
    topicId: "logical-reasoning",
    question:
      "Five people A, B, C, D, E sit in a row. A is to the left of B, C is to the right of D, and E is between A and C. Who sits in the middle?",
    options: ["A", "B", "E", "C"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "One valid arrangement satisfying all constraints: D, A, E, C, B. E is in position 3 (middle).",
    difficulty: "medium",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q8",
    subjectId: "data-science-ai",
    topicId: "quantitative-aptitude",
    question:
      "A shopkeeper marks an item 40% above cost price and offers a 20% discount. His profit percentage is:",
    options: ["12%", "16%", "20%", "10%"],
    correctAnswer: 0,
    type: "mcq",
    explanation:
      "Let CP = 100. MP = 140. SP = 140 × 0.8 = 112. Profit = 12%.",
    difficulty: "medium",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q9",
    subjectId: "data-science-ai",
    topicId: "probability",
    question:
      "A bag contains 4 red, 3 blue, and 2 green balls. One ball is drawn at random. What is the probability that it is NOT red?",
    options: ["4/9", "5/9", "1/3", "2/3"],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "P(not red) = (3 + 2)/9 = 5/9.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q10",
    subjectId: "data-science-ai",
    topicId: "logical-reasoning",
    question:
      "If MANGO is coded as NBOIP, how is GRAPE coded?",
    options: ["HSBQF", "GSBQE", "HRAPF", "ITBRF"],
    correctAnswer: 0,
    type: "mcq",
    explanation:
      "Each letter is shifted +1: G→H, R→S, A→B, P→Q, E→F → HSBQF.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },

  // ─────────────────────────────────────────────────────────────────
  // TECHNICAL SECTION – PART A (Q11–Q35) | 1 mark | -0.33
  // Topics: Linear Algebra, Probability & Stats, Programming, DSA,
  //         Databases, AI/ML basics
  // ─────────────────────────────────────────────────────────────────

  {
    id: "daMock5-q11",
    subjectId: "data-science-ai",
    topicId: "linear-algebra",
    question:
      "The rank of the matrix [[1,2,3],[2,4,6],[3,6,9]] is:",
    options: ["0", "1", "2", "3"],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "All rows are multiples of [1,2,3]. Only one linearly independent row exists, so rank = 1.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q12",
    subjectId: "data-science-ai",
    topicId: "linear-algebra",
    question:
      "Which of the following is an eigenvalue of the identity matrix I_n?",
    options: ["0", "n", "1", "-1"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "Ix = x for any vector x, so all eigenvalues of the identity matrix are 1.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q13",
    subjectId: "data-science-ai",
    topicId: "probability",
    question:
      "If X ~ N(0,1), what is E[X²]?",
    options: ["0", "1", "2", "0.5"],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "For a standard normal, Var(X) = E[X²] − (E[X])² = E[X²] − 0 = 1. So E[X²] = 1.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q14",
    subjectId: "data-science-ai",
    topicId: "statistics",
    question:
      "Which measure of central tendency is most affected by extreme values (outliers)?",
    options: ["Median", "Mode", "Mean", "Geometric Mean"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "The arithmetic mean uses all values, so a single extreme value can shift it significantly. Median is resistant to outliers.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q15",
    subjectId: "data-science-ai",
    topicId: "probability",
    question:
      "Events A and B are independent with P(A) = 0.4 and P(B) = 0.5. What is P(A ∪ B)?",
    options: ["0.7", "0.9", "0.2", "0.8"],
    correctAnswer: 0,
    type: "mcq",
    explanation:
      "P(A∪B) = P(A)+P(B)−P(A∩B) = 0.4+0.5−0.4×0.5 = 0.9−0.2 = 0.7.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q16",
    subjectId: "data-science-ai",
    topicId: "programming",
    question:
      "What is the output of the following Python snippet?\n\nx = [1, 2, 3]\ny = x\ny.append(4)\nprint(len(x))",
    options: ["3", "4", "Error", "None"],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "y = x creates a reference to the same list. Appending to y also modifies x. len(x) = 4.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q17",
    subjectId: "data-science-ai",
    topicId: "programming",
    question:
      "Which Python data structure maintains insertion order and allows duplicate values?",
    options: ["set", "dict (Python 3.7+)", "list", "frozenset"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "A list maintains insertion order and allows duplicates. Sets don't allow duplicates.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q18",
    subjectId: "data-science-ai",
    topicId: "algorithms",
    question:
      "The time complexity of binary search on a sorted array of n elements is:",
    options: ["O(n)", "O(n log n)", "O(log n)", "O(1)"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "Binary search halves the search space at each step, giving O(log n) time complexity.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q19",
    subjectId: "data-science-ai",
    topicId: "data-structures",
    question:
      "Which data structure is used for Breadth-First Search (BFS)?",
    options: ["Stack", "Queue", "Priority Queue", "Heap"],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "BFS uses a queue (FIFO) to explore nodes level by level.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q20",
    subjectId: "data-science-ai",
    topicId: "databases",
    question:
      "Which SQL clause is used to filter records after grouping?",
    options: ["WHERE", "HAVING", "GROUP BY", "ORDER BY"],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "HAVING filters groups after GROUP BY. WHERE filters individual rows before grouping.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q21",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "A model that performs perfectly on training data but poorly on test data is said to be:",
    options: ["Underfitting", "Overfitting", "Well-calibrated", "Regularized"],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Overfitting means the model has learned noise in the training data and fails to generalize.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q22",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "Which activation function outputs values strictly between 0 and 1 and is commonly used in binary classification output layers?",
    options: ["ReLU", "Tanh", "Sigmoid", "Softmax"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "Sigmoid squashes input to (0,1), making it ideal for binary classification probabilities.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q23",
    subjectId: "data-science-ai",
    topicId: "linear-algebra",
    question:
      "The determinant of a 2×2 matrix [[a,b],[c,d]] is:",
    options: ["ac − bd", "ad + bc", "ad − bc", "ab − cd"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "det([[a,b],[c,d]]) = ad − bc by definition.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q24",
    subjectId: "data-science-ai",
    topicId: "statistics",
    question:
      "The standard deviation is the square root of the:",
    options: ["Mean", "Variance", "Covariance", "Range"],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Standard deviation σ = √Variance. It measures spread in the same unit as the data.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q25",
    subjectId: "data-science-ai",
    topicId: "programming",
    question:
      "Which of the following sorting algorithms has the best average-case time complexity?",
    options: ["Bubble Sort", "Insertion Sort", "Quick Sort", "Selection Sort"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "Quick Sort has O(n log n) average-case complexity, better than O(n²) for Bubble, Insertion, and Selection Sort.",
    difficulty: "medium",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q26",
    subjectId: "data-science-ai",
    topicId: "databases",
    question:
      "In a relational database, a foreign key enforces:",
    options: [
      "Entity integrity",
      "Referential integrity",
      "Domain integrity",
      "Column uniqueness",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Foreign keys enforce referential integrity — values must exist in the referenced primary key column.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q27",
    subjectId: "data-science-ai",
    topicId: "probability",
    question:
      "If P(A|B) = P(A), then A and B are:",
    options: [
      "Mutually exclusive",
      "Exhaustive",
      "Independent",
      "Complementary",
    ],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "P(A|B) = P(A) means knowing B gives no information about A — the definition of statistical independence.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q28",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "Which loss function is used in logistic regression?",
    options: [
      "Mean Squared Error",
      "Hinge Loss",
      "Binary Cross-Entropy",
      "Huber Loss",
    ],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "Logistic regression minimizes binary cross-entropy (log loss), which measures the probability assigned to the correct class.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q29",
    subjectId: "data-science-ai",
    topicId: "algorithms",
    question:
      "What is the space complexity of merge sort?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "Merge sort requires O(n) auxiliary space to merge subarrays.",
    difficulty: "medium",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q30",
    subjectId: "data-science-ai",
    topicId: "linear-algebra",
    question:
      "For a square matrix A, if A^T = A, then A is called:",
    options: ["Orthogonal", "Singular", "Symmetric", "Diagonal"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "A matrix where A^T = A is called a symmetric matrix.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q31",
    subjectId: "data-science-ai",
    topicId: "statistics",
    question:
      "Which hypothesis test is used to compare the means of two independent groups?",
    options: ["Chi-square test", "ANOVA", "Two-sample t-test", "Z-test for proportion"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "A two-sample (independent samples) t-test compares the means of two independent groups.",
    difficulty: "medium",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q32",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "Which of the following is a non-parametric classification algorithm?",
    options: [
      "Logistic Regression",
      "Linear Discriminant Analysis",
      "Naive Bayes",
      "K-Nearest Neighbors",
    ],
    correctAnswer: 3,
    type: "mcq",
    explanation:
      "KNN makes no assumptions about the data distribution — it is non-parametric.",
    difficulty: "medium",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q33",
    subjectId: "data-science-ai",
    topicId: "programming",
    question:
      "Which NumPy function computes the dot product of two arrays?",
    options: ["np.cross()", "np.multiply()", "np.dot()", "np.outer()"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "np.dot() computes the dot (inner) product of two arrays.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q34",
    subjectId: "data-science-ai",
    topicId: "databases",
    question:
      "Which normal form eliminates transitive functional dependencies?",
    options: ["1NF", "2NF", "3NF", "BCNF"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "3NF eliminates transitive dependencies where non-key attributes depend on other non-key attributes.",
    difficulty: "medium",
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock5-q35",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "In a confusion matrix, False Positive (FP) means:",
    options: [
      "Actual positive, predicted negative",
      "Actual negative, predicted positive",
      "Actual positive, predicted positive",
      "Actual negative, predicted negative",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "FP: the model predicted positive (1) but the actual class is negative (0) — a Type I error.",
    difficulty: "easy",
    marks: 1,
    negativeMarks: 0.33,
  },

  // ─────────────────────────────────────────────────────────────────
  // TECHNICAL SECTION – PART B (Q36–Q65) | 2 marks | -0.67
  // Higher-order reasoning, deeper topics
  // ─────────────────────────────────────────────────────────────────

  {
    id: "daMock5-q36",
    subjectId: "data-science-ai",
    topicId: "linear-algebra",
    question:
      "Given matrix A = [[4,1],[2,3]], find its eigenvalues.",
    options: ["2 and 5", "3 and 4", "1 and 6", "2 and 6"],
    correctAnswer: 0,
    type: "mcq",
    explanation:
      "Characteristic equation: (4−λ)(3−λ) − 2 = λ²−7λ+10 = 0 → (λ−5)(λ−2) = 0. Eigenvalues: 2 and 5.",
    difficulty: "medium",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q37",
    subjectId: "data-science-ai",
    topicId: "calculus",
    question:
      "The gradient of f(x,y) = 3x²y + y³ at the point (1, 1) is:",
    options: ["(6, 6)", "(3, 6)", "(6, 3)", "(3, 3)"],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "∂f/∂x = 6xy → at(1,1): 6. ∂f/∂y = 3x²+3y² → at(1,1): 3+3=6. Gradient = (6, 6). Wait — ∂f/∂x=6(1)(1)=6; ∂f/∂y=3(1)²+3(1)²=6. Gradient = (6,6). Correct answer is (6,6).",
    difficulty: "medium",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q38",
    subjectId: "data-science-ai",
    topicId: "probability",
    question:
      "A random variable X has a Poisson distribution with λ = 3. What is P(X = 2)?",
    options: ["3e⁻³/2", "9e⁻³/2", "e⁻³", "3e⁻³"],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "P(X=k) = e^{-λ}·λ^k/k! = e^{-3}·9/2 = 9e^{-3}/2.",
    difficulty: "medium",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q39",
    subjectId: "data-science-ai",
    topicId: "statistics",
    question:
      "What does a p-value of 0.03 indicate when the significance level α = 0.05?",
    options: [
      "Fail to reject null hypothesis",
      "Reject null hypothesis",
      "Accept alternative hypothesis with 97% confidence",
      "The test is inconclusive",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "p-value (0.03) < α (0.05), so we reject the null hypothesis. This does not mean we 'accept' the alternative with certainty.",
    difficulty: "medium",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q40",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "Which of the following is TRUE about the bias-variance tradeoff?",
    options: [
      "Increasing model complexity always reduces both bias and variance",
      "A high-bias model is likely to overfit",
      "Reducing variance always increases bias",
      "A simple model tends to have high bias and low variance",
    ],
    correctAnswer: 3,
    type: "mcq",
    explanation:
      "Simple models underfit (high bias, low variance). Complex models overfit (low bias, high variance). Reducing one generally increases the other.",
    difficulty: "medium",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q41",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "In gradient descent, if the learning rate is too large, what can happen?",
    options: [
      "Convergence to global minimum is guaranteed",
      "The algorithm may overshoot and diverge",
      "Training becomes faster with better accuracy",
      "Bias increases",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "A very large learning rate causes the algorithm to overshoot the minimum, potentially diverging rather than converging.",
    difficulty: "medium",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q42",
    subjectId: "data-science-ai",
    topicId: "deep-learning",
    question:
      "Which of the following best describes the vanishing gradient problem?",
    options: [
      "Gradients become very large in deep networks",
      "Gradients approach zero, making early layers learn very slowly",
      "Loss function does not converge",
      "Weights are initialized to zero",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "In deep networks with sigmoid/tanh, gradients are repeatedly multiplied by values < 1 during backpropagation, shrinking exponentially toward zero.",
    difficulty: "medium",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q43",
    subjectId: "data-science-ai",
    topicId: "deep-learning",
    question:
      "Which technique is used in CNNs to reduce spatial dimensions while retaining important features?",
    options: ["Dropout", "Batch Normalization", "Pooling", "Skip Connections"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "Pooling (max/average) reduces spatial dimensions (height × width) while retaining dominant features, reducing computation.",
    difficulty: "medium",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q44",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "In a decision tree, the Gini impurity of a node where all samples belong to one class is:",
    options: ["1", "0.5", "0", "0.25"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "Gini = 1 − Σp² = 1 − 1² = 0 when all samples are of one class (perfect purity).",
    difficulty: "medium",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q45",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "Random Forest reduces overfitting compared to a single decision tree primarily through:",
    options: [
      "Using a deeper tree",
      "Bagging (bootstrap aggregation) and feature randomness",
      "Boosting individual trees",
      "Using a fixed learning rate",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Random Forest uses bootstrap sampling and random feature subsets at each split, reducing correlation between trees and variance.",
    difficulty: "medium",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q46",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "In Support Vector Machines (SVM), the support vectors are:",
    options: [
      "All training data points",
      "Data points farthest from the decision boundary",
      "Data points closest to the decision boundary",
      "Misclassified data points",
    ],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "Support vectors are the training samples that lie closest to the hyperplane and define the margin.",
    difficulty: "medium",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q47",
    subjectId: "data-science-ai",
    topicId: "regularization",
    question:
      "Elastic Net regularization combines which two penalties?",
    options: [
      "L1 and L3",
      "L1 (Lasso) and L2 (Ridge)",
      "L2 and dropout",
      "L0 and L2",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Elastic Net = α·L1 + (1−α)·L2, combining sparsity from Lasso and smoothness from Ridge.",
    difficulty: "medium",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q48",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "Which cross-validation technique is most appropriate when the dataset is very small?",
    options: [
      "Holdout (70-30 split)",
      "K-fold with k=5",
      "Leave-One-Out Cross-Validation (LOOCV)",
      "Stratified 80-20 split",
    ],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "LOOCV uses n−1 samples for training each time, maximizing training data — ideal for very small datasets.",
    difficulty: "medium",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q49",
    subjectId: "data-science-ai",
    topicId: "natural-language-processing",
    question:
      "TF-IDF down-weights words that appear:",
    options: [
      "Rarely across the corpus",
      "Frequently in one document but rarely in others",
      "Frequently across many documents",
      "Only in the query document",
    ],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "IDF = log(N/df). Words appearing in many documents get a low IDF, reducing their TF-IDF score.",
    difficulty: "medium",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q50",
    subjectId: "data-science-ai",
    topicId: "deep-learning",
    question:
      "In an LSTM, which gate controls how much past information to forget?",
    options: ["Input gate", "Output gate", "Forget gate", "Cell gate"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "The forget gate uses a sigmoid activation to decide what fraction of the previous cell state to retain or discard.",
    difficulty: "medium",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q51",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "Precision is defined as:",
    options: [
      "TP / (TP + FN)",
      "TP / (TP + FP)",
      "TN / (TN + FP)",
      "(TP + TN) / (TP + TN + FP + FN)",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Precision = TP/(TP+FP). Of all predicted positives, what fraction is actually positive.",
    difficulty: "easy",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q52",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "The ROC curve plots:",
    options: [
      "Precision vs Recall",
      "True Positive Rate vs False Positive Rate",
      "Loss vs Epochs",
      "Accuracy vs Threshold",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "ROC (Receiver Operating Characteristic) plots TPR (Recall/Sensitivity) on Y-axis vs FPR (1−Specificity) on X-axis at varying thresholds.",
    difficulty: "medium",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q53",
    subjectId: "data-science-ai",
    topicId: "probability",
    question:
      "Bayes' theorem states: P(A|B) = ?",
    options: [
      "P(B|A) · P(B) / P(A)",
      "P(A) · P(B) / P(A|B)",
      "P(B|A) · P(A) / P(B)",
      "P(A|B) · P(A) / P(B)",
    ],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "Bayes' theorem: P(A|B) = P(B|A)·P(A) / P(B). P(A) is the prior, P(B|A) the likelihood, P(B) the marginal probability.",
    difficulty: "easy",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q54",
    subjectId: "data-science-ai",
    topicId: "statistics",
    question:
      "The Central Limit Theorem states that for large sample sizes, the sampling distribution of the sample mean approaches:",
    options: [
      "Uniform distribution",
      "Poisson distribution",
      "Normal distribution regardless of population distribution",
      "Exponential distribution",
    ],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "CLT: the sample mean of n independent samples from any distribution with finite mean and variance converges to a normal distribution as n → ∞.",
    difficulty: "medium",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q55",
    subjectId: "data-science-ai",
    topicId: "deep-learning",
    question:
      "Batch Normalization in neural networks:",
    options: [
      "Randomly drops neurons during training",
      "Normalizes inputs to each layer, accelerating training",
      "Reduces the number of parameters",
      "Applies L2 regularization to weights",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Batch Normalization normalizes the inputs of each layer to have zero mean and unit variance, reducing internal covariate shift and accelerating training.",
    difficulty: "medium",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q56",
    subjectId: "data-science-ai",
    topicId: "algorithms",
    question:
      "Which algorithm finds the shortest path from a single source to all other nodes in a weighted graph with non-negative edges?",
    options: [
      "Bellman-Ford",
      "Floyd-Warshall",
      "Dijkstra's algorithm",
      "Prim's algorithm",
    ],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "Dijkstra's algorithm finds shortest paths from a single source in O((V+E)logV) for non-negative edge weights.",
    difficulty: "medium",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q57",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "In Naive Bayes classification, the 'naive' assumption refers to:",
    options: [
      "All classes are equally probable",
      "Conditional independence of features given the class",
      "Linear separability of classes",
      "Gaussian distribution of all features",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Naive Bayes assumes all features are conditionally independent given the class label — a strong (naive) simplification.",
    difficulty: "medium",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q58",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "Which of the following ensemble methods trains models sequentially, each correcting the errors of the previous?",
    options: ["Bagging", "Random Forest", "Boosting", "Stacking"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "Boosting (e.g., AdaBoost, XGBoost) trains models sequentially; each new model focuses on samples misclassified by the previous ones.",
    difficulty: "medium",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q59",
    subjectId: "data-science-ai",
    topicId: "linear-algebra",
    question:
      "Singular Value Decomposition (SVD) decomposes matrix A into:",
    options: [
      "A = L · U",
      "A = Q · R",
      "A = U · Σ · V^T",
      "A = P · D · P⁻¹",
    ],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "SVD: A = UΣV^T where U,V are orthogonal matrices and Σ is a diagonal matrix of singular values.",
    difficulty: "hard",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q60",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "Which of the following statements about k-fold cross-validation is CORRECT?",
    options: [
      "Training is done k times, each time using k folds for training",
      "The dataset is split into k folds; each fold serves as the test set once",
      "All k models are averaged to produce the final model",
      "It eliminates the need for a separate test set",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "In k-fold CV, the data is divided into k parts. In each iteration, one fold is the test set and the remaining k−1 folds are training data.",
    difficulty: "medium",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q61",
    subjectId: "data-science-ai",
    topicId: "deep-learning",
    question:
      "The attention mechanism in Transformers computes:",
    options: [
      "Attention(Q,K,V) = softmax(QK^T)V",
      "Attention(Q,K,V) = softmax(QK^T / √d_k)V",
      "Attention(Q,K,V) = sigmoid(QV^T)K",
      "Attention(Q,K,V) = ReLU(QK^T)V",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Scaled dot-product attention = softmax(QK^T / √d_k)·V. Scaling by √d_k prevents gradient vanishing with large dimensionality.",
    difficulty: "hard",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q62",
    subjectId: "data-science-ai",
    topicId: "statistics",
    question:
      "Pearson correlation coefficient r = 0 implies:",
    options: [
      "The variables are definitely independent",
      "There is no linear relationship between the variables",
      "The variables are negatively correlated",
      "The variables have equal variance",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "r = 0 means no linear relationship. Non-linear relationships can still exist (e.g., y = x²). It does not imply full independence.",
    difficulty: "medium",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q63",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "The VC dimension of a linear classifier in d-dimensional space is:",
    options: ["d", "d + 1", "2d", "d²"],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "The VC dimension of a linear classifier (hyperplane) in d dimensions is d + 1, representing the maximum number of points it can shatter.",
    difficulty: "hard",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q64",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "The Expectation-Maximization (EM) algorithm is commonly used to train:",
    options: [
      "Support Vector Machines",
      "Gaussian Mixture Models",
      "Decision Trees",
      "Convolutional Neural Networks",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "EM alternates between E-step (estimating latent variable distributions) and M-step (maximizing likelihood). It is the standard training algorithm for GMMs.",
    difficulty: "hard",
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock5-q65",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "Which statement about PCA is INCORRECT?",
    options: [
      "PCA finds orthogonal directions of maximum variance",
      "The principal components are eigenvectors of the covariance matrix",
      "PCA can always improve classification accuracy",
      "PCA is sensitive to the scale of features",
    ],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "PCA does not always improve classification accuracy — discarding lower-variance components may remove class-discriminative information. The other three statements are true.",
    difficulty: "hard",
    marks: 2,
    negativeMarks: 0.67,
  },
];