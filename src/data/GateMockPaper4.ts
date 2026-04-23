export const daMockPaper7Questions = [
  // ─────────────────────────────────────────────
  // GENERAL APTITUDE (Q1–Q10) | 1 mark | -0.33
  // ─────────────────────────────────────────────

  {
    id: "daMock7-q1",
    subjectId: "data-science-ai",
    topicId: "verbal-reasoning",
    question:
      "Choose the word most SIMILAR in meaning to 'CANDID':",
    options: ["Evasive", "Frank", "Timid", "Biased"],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "'Candid' means truthful and straightforward; 'frank' is the closest synonym.",
    difficulty: "easy",
    eloRating: 1100,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q2",
    subjectId: "data-science-ai",
    topicId: "logical-reasoning",
    question:
      "In a row of children, Rahul is 7th from the left and 13th from the right. How many children are in the row?",
    options: ["18", "19", "20", "21"],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Total = (7 − 1) + (13 − 1) + 1 = 6 + 12 + 1 = 19.",
    difficulty: "easy",
    eloRating: 1200,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q3",
    subjectId: "data-science-ai",
    topicId: "quantitative-aptitude",
    question:
      "A sum of money doubles itself in 8 years at simple interest. What is the annual rate of interest?",
    options: ["10%", "12%", "12.5%", "15%"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "SI = P, T = 8. R = (SI × 100)/(P × T) = (P × 100)/(P × 8) = 12.5%.",
    difficulty: "easy",
    eloRating: 1200,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q4",
    subjectId: "data-science-ai",
    topicId: "quantitative-aptitude",
    question:
      "In what ratio must tea at ₹60/kg be mixed with tea at ₹90/kg to get a blend of ₹75/kg?",
    options: ["1:1", "2:1", "1:2", "3:2"],
    correctAnswer: 0,
    type: "mcq",
    explanation:
      "By alligation: (90−75):(75−60) = 15:15 = 1:1.",
    difficulty: "medium",
    eloRating: 1300,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q5",
    subjectId: "data-science-ai",
    topicId: "verbal-reasoning",
    question:
      "Find the grammatically correct sentence:",
    options: [
      "The data shows that sales are declining.",
      "The data show that sales are declining.",
      "The data is showing that sales are declining.",
      "The datas show that sales are declining.",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "'Data' is plural (datum is singular); formal/academic usage requires 'show' (plural verb). 'Datas' is not a word.",
    difficulty: "medium",
    eloRating: 1300,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q6",
    subjectId: "data-science-ai",
    topicId: "logical-reasoning",
    question:
      "If A > B, B > C, and C > D, which of the following is NOT necessarily true?",
    options: ["A > C", "A > D", "B > D", "D > A"],
    correctAnswer: 3,
    type: "mcq",
    explanation:
      "A > B > C > D, so A > C, A > D, and B > D are all necessarily true. D > A contradicts the chain.",
    difficulty: "easy",
    eloRating: 1150,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q7",
    subjectId: "data-science-ai",
    topicId: "quantitative-aptitude",
    question:
      "A circle has radius 7 cm. What is its area? (π = 22/7)",
    options: ["154 cm²", "44 cm²", "49 cm²", "140 cm²"],
    correctAnswer: 0,
    type: "mcq",
    explanation:
      "Area = π r² = (22/7) × 49 = 154 cm².",
    difficulty: "easy",
    eloRating: 1150,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q8",
    subjectId: "data-science-ai",
    topicId: "quantitative-aptitude",
    question:
      "The LCM of 12, 15, and 20 is:",
    options: ["30", "60", "120", "180"],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "12 = 2²×3, 15 = 3×5, 20 = 2²×5. LCM = 2²×3×5 = 60.",
    difficulty: "easy",
    eloRating: 1200,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q9",
    subjectId: "data-science-ai",
    topicId: "logical-reasoning",
    question:
      "Pointing to a photograph, Anil said 'She is the daughter of my grandfather's only son.' What is the relation of the girl to Anil?",
    options: ["Sister", "Cousin", "Niece", "Mother"],
    correctAnswer: 0,
    type: "mcq",
    explanation:
      "Grandfather's only son = Anil's father. Daughter of Anil's father = Anil's sister.",
    difficulty: "easy",
    eloRating: 1200,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q10",
    subjectId: "data-science-ai",
    topicId: "quantitative-aptitude",
    question:
      "If 5 workers can complete a task in 12 days, how many days will 4 workers take to complete the same task?",
    options: ["9.6 days", "10 days", "12 days", "15 days"],
    correctAnswer: 3,
    type: "mcq",
    explanation:
      "Total work = 5 × 12 = 60 worker-days. 4 workers: 60/4 = 15 days.",
    difficulty: "easy",
    eloRating: 1200,
    marks: 1,
    negativeMarks: 0.33,
  },

  // ─────────────────────────────────────────────────────────────────
  // TECHNICAL SECTION – PART A (Q11–Q35) | 1 mark | -0.33
  // ─────────────────────────────────────────────────────────────────

  {
    id: "daMock7-q11",
    subjectId: "data-science-ai",
    topicId: "linear-algebra",
    question:
      "For vectors u and v, the Cauchy-Schwarz inequality states:",
    options: [
      "|u · v| ≤ ||u|| + ||v||",
      "|u · v| ≤ ||u|| × ||v||",
      "|u · v| = ||u|| × ||v||",
      "|u · v| ≥ ||u|| × ||v||",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Cauchy-Schwarz: |u · v| ≤ ||u|| ||v||. Equality holds when u and v are parallel.",
    difficulty: "medium",
    eloRating: 1400,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q12",
    subjectId: "data-science-ai",
    topicId: "probability",
    question:
      "Which distribution models the number of trials until the first success?",
    options: ["Binomial", "Poisson", "Geometric", "Normal"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "The Geometric distribution models the number of Bernoulli trials needed to get the first success.",
    difficulty: "easy",
    eloRating: 1200,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q13",
    subjectId: "data-science-ai",
    topicId: "statistics",
    question:
      "Skewness of a distribution measures:",
    options: [
      "The peak height of the distribution",
      "The asymmetry of the distribution around its mean",
      "The spread of the distribution",
      "The number of modes",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Skewness quantifies the asymmetry. Positive skew: long right tail; negative skew: long left tail.",
    difficulty: "easy",
    eloRating: 1200,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q14",
    subjectId: "data-science-ai",
    topicId: "programming",
    question:
      "What is the output of the following Python code?\n\nfor i in range(3):\n    pass\nprint(i)",
    options: ["0", "1", "2", "Error"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "The loop variable i is accessible after the loop. The last value assigned is 2 (range(3) goes 0,1,2).",
    difficulty: "medium",
    eloRating: 1300,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q15",
    subjectId: "data-science-ai",
    topicId: "algorithms",
    question:
      "Heap sort has which time complexity in the worst case?",
    options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Heap sort always runs in O(n log n) in all cases (best, average, worst), using a binary heap.",
    difficulty: "easy",
    eloRating: 1250,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q16",
    subjectId: "data-science-ai",
    topicId: "databases",
    question:
      "ACID properties in a database system stand for:",
    options: [
      "Atomicity, Consistency, Isolation, Durability",
      "Accuracy, Consistency, Integrity, Durability",
      "Atomicity, Correctness, Isolation, Distribution",
      "Accuracy, Concurrency, Isolation, Durability",
    ],
    correctAnswer: 0,
    type: "mcq",
    explanation:
      "ACID: Atomicity (all-or-nothing), Consistency (valid state), Isolation (concurrent transactions), Durability (committed data persists).",
    difficulty: "easy",
    eloRating: 1200,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q17",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "Which of the following is TRUE about Lasso (L1) regularisation?",
    options: [
      "It shrinks all coefficients towards zero but never to exactly zero",
      "It can produce sparse models by setting some coefficients to exactly zero",
      "It adds the square of weights to the cost function",
      "It always performs worse than Ridge",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Lasso uses the L1 penalty (|w|), which can set coefficients to exactly zero, performing implicit feature selection.",
    difficulty: "easy",
    eloRating: 1300,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q18",
    subjectId: "data-science-ai",
    topicId: "deep-learning",
    question:
      "Which optimiser combines momentum and adaptive learning rates and is considered a default choice for deep learning?",
    options: ["SGD", "Adagrad", "Adam", "RMSProp"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "Adam (Adaptive Moment Estimation) combines first-order momentum and second-order adaptive scaling of learning rates.",
    difficulty: "easy",
    eloRating: 1250,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q19",
    subjectId: "data-science-ai",
    topicId: "linear-algebra",
    question:
      "Two vectors are orthogonal if their dot product is:",
    options: ["1", "-1", "0", "Equal to their magnitudes"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "Two vectors u and v are orthogonal (perpendicular) if u · v = 0.",
    difficulty: "easy",
    eloRating: 1150,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q20",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "Entropy in decision trees (information gain) is defined using which function?",
    options: [
      "H = −Σ pᵢ log₂(pᵢ)",
      "H = Σ pᵢ²",
      "H = 1 − Σ pᵢ²",
      "H = Σ pᵢ log₂(1/pᵢ²)",
    ],
    correctAnswer: 0,
    type: "mcq",
    explanation:
      "Shannon entropy: H = −Σ pᵢ log₂(pᵢ). Maximum entropy occurs at equal class probabilities.",
    difficulty: "easy",
    eloRating: 1250,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q21",
    subjectId: "data-science-ai",
    topicId: "natural-language-processing",
    question:
      "Part-of-Speech (POS) tagging assigns:",
    options: [
      "A sentiment score to each sentence",
      "Grammatical category labels (noun, verb, adjective...) to each token",
      "Named entity types to words",
      "Dependency relations between words",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "POS tagging labels each word with its grammatical role (noun, verb, adjective, etc.) for downstream NLP tasks.",
    difficulty: "easy",
    eloRating: 1200,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q22",
    subjectId: "data-science-ai",
    topicId: "data-structures",
    question:
      "An AVL tree is a binary search tree that maintains:",
    options: [
      "All nodes at the same level",
      "A balance factor of ±1 for every node",
      "Only left subtree height > right subtree height",
      "Exactly two children for every node",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "An AVL tree ensures that the height difference (balance factor) between left and right subtrees is at most 1 for every node, guaranteeing O(log n) operations.",
    difficulty: "medium",
    eloRating: 1350,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q23",
    subjectId: "data-science-ai",
    topicId: "statistics",
    question:
      "Kurtosis measures:",
    options: [
      "The asymmetry of a distribution",
      "The tailedness/peakedness of a distribution compared to a normal distribution",
      "The spread of a distribution",
      "The number of modes",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Kurtosis measures the 'tailedness'. Leptokurtic (kurtosis > 3) has heavy tails; platykurtic (< 3) has light tails.",
    difficulty: "medium",
    eloRating: 1350,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q24",
    subjectId: "data-science-ai",
    topicId: "programming",
    question:
      "Which Python function can be used to apply a function to each element of a list without a loop?",
    options: ["filter()", "reduce()", "map()", "zip()"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "map(func, iterable) applies func to every element of the iterable, returning a map object.",
    difficulty: "easy",
    eloRating: 1200,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q25",
    subjectId: "data-science-ai",
    topicId: "databases",
    question:
      "In the relational model, a tuple is equivalent to a:",
    options: ["Column", "Row", "Table", "Key"],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "In relational database theory, a tuple corresponds to a row (record) in a table.",
    difficulty: "easy",
    eloRating: 1150,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q26",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "The 'elbow method' is used to determine the optimal value of:",
    options: [
      "The number of trees in a Random Forest",
      "The learning rate in gradient descent",
      "k in k-means clustering",
      "The regularisation parameter λ",
    ],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "The elbow method plots WCSS vs. k and identifies the 'elbow' point where adding more clusters yields diminishing returns.",
    difficulty: "easy",
    eloRating: 1250,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q27",
    subjectId: "data-science-ai",
    topicId: "probability",
    question:
      "The sum of all probabilities in a probability distribution must equal:",
    options: ["0", "0.5", "1", "It depends on the distribution"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "By axioms of probability, the total probability over the entire sample space must equal 1.",
    difficulty: "easy",
    eloRating: 1100,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q28",
    subjectId: "data-science-ai",
    topicId: "deep-learning",
    question:
      "In a recurrent neural network (RNN), what is the key structural feature that allows processing sequential data?",
    options: [
      "Multiple convolution layers",
      "Pooling layers reducing spatial dimensions",
      "A hidden state passed from one time step to the next",
      "Residual skip connections",
    ],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "RNNs maintain a hidden state hₜ that captures information from previous time steps: hₜ = f(hₜ₋₁, xₜ).",
    difficulty: "easy",
    eloRating: 1300,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q29",
    subjectId: "data-science-ai",
    topicId: "algorithms",
    question:
      "Prim's and Kruskal's algorithms are used to find:",
    options: [
      "Shortest paths in a directed graph",
      "Minimum spanning tree of a weighted undirected graph",
      "Maximum flow in a network",
      "Strongly connected components",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Both Prim's and Kruskal's find the Minimum Spanning Tree (MST) of a weighted undirected graph.",
    difficulty: "easy",
    eloRating: 1250,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q30",
    subjectId: "data-science-ai",
    topicId: "statistics",
    question:
      "A 95% confidence interval means:",
    options: [
      "There is a 95% probability the population parameter lies in this interval",
      "If we repeated the experiment many times, 95% of intervals would contain the true parameter",
      "The sample statistic has 95% accuracy",
      "95% of the data lies within the interval",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Frequentist interpretation: 95% CI means that if the procedure is repeated many times, 95% of constructed intervals will contain the true parameter.",
    difficulty: "medium",
    eloRating: 1400,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q31",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "In AdaBoost, misclassified samples are handled by:",
    options: [
      "Removing them from the training set",
      "Increasing their weights so subsequent classifiers focus on them",
      "Decreasing their weights",
      "Duplicating all correctly classified samples",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "AdaBoost increases the weights of misclassified examples and decreases correctly classified ones, forcing subsequent weak learners to focus on hard cases.",
    difficulty: "medium",
    eloRating: 1400,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q32",
    subjectId: "data-science-ai",
    topicId: "linear-algebra",
    question:
      "The null space (kernel) of a matrix A consists of all vectors x such that:",
    options: ["Ax = I", "Ax = 1", "Ax = 0", "A^T x = 0"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "The null space (kernel) is the set {x : Ax = 0}. Its dimension is the nullity of A.",
    difficulty: "medium",
    eloRating: 1350,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q33",
    subjectId: "data-science-ai",
    topicId: "deep-learning",
    question:
      "Which loss function is typically used for multi-class classification in neural networks?",
    options: [
      "Binary cross-entropy",
      "Categorical cross-entropy with softmax output",
      "Mean squared error",
      "Hinge loss",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "For multi-class classification, categorical cross-entropy combined with a softmax output layer is the standard choice.",
    difficulty: "easy",
    eloRating: 1250,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q34",
    subjectId: "data-science-ai",
    topicId: "algorithms",
    question:
      "Which of the following recurrence relations describes the time complexity of binary search?",
    options: ["T(n) = T(n−1) + O(1)", "T(n) = 2T(n/2) + O(n)", "T(n) = T(n/2) + O(1)", "T(n) = T(n/2) + O(n)"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "Binary search splits the array in half and does constant work: T(n) = T(n/2) + O(1), solving to O(log n).",
    difficulty: "medium",
    eloRating: 1400,
    marks: 1,
    negativeMarks: 0.33,
  },
  {
    id: "daMock7-q35",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "Which statement about feature scaling is CORRECT?",
    options: [
      "Decision trees require feature scaling to work correctly",
      "KNN and gradient descent-based models benefit from feature scaling",
      "Feature scaling is only needed for binary features",
      "Scaling features worsens logistic regression performance",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Distance-based algorithms (KNN, SVM) and gradient descent converge faster with scaled features. Tree-based algorithms are invariant to scaling.",
    difficulty: "medium",
    eloRating: 1350,
    marks: 1,
    negativeMarks: 0.33,
  },

  // ─────────────────────────────────────────────────────────────────
  // TECHNICAL SECTION – PART B (Q36–Q65) | 2 marks | -0.67
  // ─────────────────────────────────────────────────────────────────

  {
    id: "daMock7-q36",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "For a confusion matrix with TP=50, FP=10, FN=5, TN=35, what is the accuracy?",
    options: ["0.82", "0.85", "0.88", "0.90"],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Accuracy = (TP+TN)/(TP+TN+FP+FN) = (50+35)/(100) = 85/100 = 0.85.",
    difficulty: "medium",
    eloRating: 1400,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q37",
    subjectId: "data-science-ai",
    topicId: "statistics",
    question:
      "If a population is normally distributed with μ=100 and σ=15, approximately what percentage of data falls within one standard deviation?",
    options: ["50%", "68%", "95%", "99.7%"],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "By the 68-95-99.7 rule: ~68% within ±1σ, ~95% within ±2σ, ~99.7% within ±3σ.",
    difficulty: "easy",
    eloRating: 1250,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q38",
    subjectId: "data-science-ai",
    topicId: "linear-algebra",
    question:
      "Principal Component Analysis computes principal components as:",
    options: [
      "Rows of the data matrix",
      "Eigenvectors of the covariance matrix sorted by descending eigenvalues",
      "Column means of the data matrix",
      "Singular values of the data matrix",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "PCA finds the eigenvectors of the covariance matrix (principal directions) ordered by their eigenvalues (explained variance).",
    difficulty: "medium",
    eloRating: 1500,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q39",
    subjectId: "data-science-ai",
    topicId: "deep-learning",
    question:
      "The number of trainable parameters in a fully connected (dense) layer with 256 input units and 128 output units (with bias) is:",
    options: ["256 × 128", "256 × 128 + 128", "256 × 128 + 256", "256 + 128"],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Weight matrix: 256×128 = 32,768 parameters. Bias: 128. Total = 32,768 + 128 = 32,896 = 256×128 + 128.",
    difficulty: "medium",
    eloRating: 1450,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q40",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "Which of the following is an advantage of Gradient Boosting over Random Forest?",
    options: [
      "Gradient Boosting is always faster to train",
      "Gradient Boosting typically achieves lower bias as it directly optimises a loss function",
      "Gradient Boosting is more robust to outliers",
      "Gradient Boosting requires no hyperparameter tuning",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Gradient Boosting directly optimises a differentiable loss function, achieving lower bias. It is however slower to train and more prone to overfitting without careful tuning.",
    difficulty: "hard",
    eloRating: 1600,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q41",
    subjectId: "data-science-ai",
    topicId: "probability",
    question:
      "For a continuous random variable X, P(X = a) for any specific value a is:",
    options: ["1", "0.5", "0", "Depends on the distribution"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "For continuous distributions, probability is defined over intervals; the probability at any single point is 0.",
    difficulty: "medium",
    eloRating: 1400,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q42",
    subjectId: "data-science-ai",
    topicId: "natural-language-processing",
    question:
      "The BLEU score is used to evaluate:",
    options: [
      "Sentiment analysis accuracy",
      "Named entity recognition F1",
      "Machine translation quality by comparing n-gram overlap with reference translations",
      "Document classification accuracy",
    ],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "BLEU (Bilingual Evaluation Understudy) measures n-gram precision of machine translations against human references.",
    difficulty: "medium",
    eloRating: 1500,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q43",
    subjectId: "data-science-ai",
    topicId: "deep-learning",
    question:
      "Self-attention in the Transformer architecture allows:",
    options: [
      "Each position to attend to all positions in the same sequence simultaneously",
      "The model to attend only to adjacent tokens",
      "Each token to attend only to past tokens",
      "Sharing of attention weights across layers",
    ],
    correctAnswer: 0,
    type: "mcq",
    explanation:
      "Self-attention computes relations between all pairs of positions in the sequence simultaneously, capturing global dependencies in O(n²) per layer.",
    difficulty: "hard",
    eloRating: 1650,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q44",
    subjectId: "data-science-ai",
    topicId: "linear-algebra",
    question:
      "For a data matrix X (n×d), the covariance matrix is computed as:",
    options: [
      "X^T X / n",
      "(X − μ)^T (X − μ) / (n−1)",
      "X X^T / d",
      "X^T (X − μ) / n",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Sample covariance matrix = (X−μ)^T(X−μ)/(n−1) where μ is the mean-centered data. Using n−1 gives an unbiased estimate.",
    difficulty: "hard",
    eloRating: 1600,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q45",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "DBSCAN clustering differs from k-means in that it:",
    options: [
      "Requires the number of clusters to be specified in advance",
      "Can detect clusters of arbitrary shape and identify noise points",
      "Only works on numeric data",
      "Minimises within-cluster sum of squares",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "DBSCAN (Density-Based Spatial Clustering) identifies clusters of arbitrary shape using density reachability and marks low-density points as noise — no need to pre-specify k.",
    difficulty: "medium",
    eloRating: 1500,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q46",
    subjectId: "data-science-ai",
    topicId: "algorithms",
    question:
      "Which of the following dynamic programming problems finds the length of the longest common subsequence of two strings of length m and n?",
    options: ["O(m+n)", "O(mn)", "O(m log n)", "O(2^(m+n))"],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "LCS uses a 2D DP table of size m×n, leading to O(mn) time and space complexity.",
    difficulty: "medium",
    eloRating: 1500,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q47",
    subjectId: "data-science-ai",
    topicId: "statistics",
    question:
      "Bootstrap resampling is used to:",
    options: [
      "Increase the size of the training dataset by generating synthetic samples",
      "Estimate the sampling distribution of a statistic by resampling with replacement",
      "Remove outliers from the dataset",
      "Normalise features to unit variance",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Bootstrap draws B random samples with replacement from the dataset to estimate the distribution (e.g., variance, CI) of a statistic.",
    difficulty: "medium",
    eloRating: 1450,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q48",
    subjectId: "data-science-ai",
    topicId: "deep-learning",
    question:
      "Positional encoding in the Transformer architecture is added because:",
    options: [
      "Attention is not invariant to sequence length",
      "Self-attention has no inherent notion of order, so position information must be injected",
      "It replaces the need for an embedding layer",
      "It reduces the number of attention heads needed",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Self-attention treats all positions symmetrically. Positional encodings (sine/cosine functions or learned) inject sequential position information into the model.",
    difficulty: "hard",
    eloRating: 1650,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q49",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "In the context of model evaluation, data leakage occurs when:",
    options: [
      "The test set is too small",
      "Information from the test set influences the training process",
      "The model overfits the training data",
      "Features are highly correlated",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Data leakage happens when test/future information leaks into training (e.g., scaling using test statistics), producing optimistically biased evaluation.",
    difficulty: "medium",
    eloRating: 1450,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q50",
    subjectId: "data-science-ai",
    topicId: "probability",
    question:
      "The moment generating function (MGF) of a random variable X is defined as:",
    options: ["E[Xᵗ]", "E[etX]", "E[X^t/t!]", "E[log(X)]"],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "The MGF is M_X(t) = E[e^{tX}]. It encodes all moments: E[Xⁿ] = M_X^(n)(0).",
    difficulty: "hard",
    eloRating: 1650,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q51",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "SMOTE (Synthetic Minority Over-sampling Technique) addresses class imbalance by:",
    options: [
      "Removing majority class examples",
      "Creating synthetic minority class examples by interpolating between real ones",
      "Assigning higher class weights to minority samples",
      "Using only the minority class for training",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "SMOTE generates synthetic samples by interpolating between a minority class example and one of its k-nearest minority neighbours in feature space.",
    difficulty: "medium",
    eloRating: 1500,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q52",
    subjectId: "data-science-ai",
    topicId: "deep-learning",
    question:
      "Which statement about weight initialisation in deep neural networks is CORRECT?",
    options: [
      "Initialising all weights to zero is the safest strategy",
      "Zero initialisation causes all neurons to compute identical gradients, preventing learning",
      "Large random initialisation always speeds up convergence",
      "Weight initialisation has no effect on training deep networks",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Zero initialisation leads to symmetric neurons that compute the same output and receive the same gradient — the symmetry breaking problem. Random or Xavier/He initialisation is preferred.",
    difficulty: "medium",
    eloRating: 1500,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q53",
    subjectId: "data-science-ai",
    topicId: "statistics",
    question:
      "The Shapiro-Wilk test is used to assess:",
    options: [
      "Equality of variances",
      "Normality of a distribution",
      "Independence of two variables",
      "Difference between two proportions",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "The Shapiro-Wilk test is a goodness-of-fit test for normality; a low p-value suggests deviation from normality.",
    difficulty: "medium",
    eloRating: 1450,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q54",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "Multi-armed bandit problems in reinforcement learning are characterised by the need to balance:",
    options: [
      "Bias and variance",
      "Exploration (trying new actions) and exploitation (using known best actions)",
      "Precision and recall",
      "Training and validation loss",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "The exploration-exploitation dilemma: exploit known good actions to maximise immediate reward, or explore new actions that might be better.",
    difficulty: "medium",
    eloRating: 1500,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q55",
    subjectId: "data-science-ai",
    topicId: "linear-algebra",
    question:
      "The Cholesky decomposition A = LL^T applies to matrices that are:",
    options: [
      "Diagonal",
      "Symmetric positive definite",
      "Orthogonal",
      "Upper triangular",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Cholesky decomposition decomposes a symmetric positive definite matrix into A = LL^T where L is a lower triangular matrix.",
    difficulty: "hard",
    eloRating: 1650,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q56",
    subjectId: "data-science-ai",
    topicId: "natural-language-processing",
    question:
      "Named Entity Recognition (NER) is the task of:",
    options: [
      "Classifying the sentiment of a document",
      "Identifying and classifying named entities (persons, organisations, locations) in text",
      "Translating text between languages",
      "Summarising long documents",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "NER detects and classifies mentions of named entities (people, places, organisations, dates) in text.",
    difficulty: "easy",
    eloRating: 1250,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q57",
    subjectId: "data-science-ai",
    topicId: "deep-learning",
    question:
      "The encoder in a Variational Autoencoder (VAE) outputs:",
    options: [
      "A single latent vector",
      "Mean and variance of a Gaussian distribution in latent space",
      "A discrete code",
      "A probability distribution over the input space",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "The VAE encoder outputs μ and log σ² defining a Gaussian distribution. Samples from this distribution are passed to the decoder.",
    difficulty: "hard",
    eloRating: 1700,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q58",
    subjectId: "data-science-ai",
    topicId: "statistics",
    question:
      "Spearman's rank correlation coefficient differs from Pearson's in that it:",
    options: [
      "Measures linear correlation only",
      "Is based on ranked values and measures monotonic relationships",
      "Can only be computed for normally distributed data",
      "Requires equal sample sizes",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Spearman's ρ converts values to ranks, measuring monotonic (not necessarily linear) relationships and being robust to outliers and non-normality.",
    difficulty: "medium",
    eloRating: 1450,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q59",
    subjectId: "data-science-ai",
    topicId: "algorithms",
    question:
      "The Knapsack problem (0/1 variant) is solved optimally by dynamic programming with time complexity:",
    options: ["O(n log n)", "O(n²)", "O(nW) where W is the capacity", "O(2ⁿ)"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "The 0/1 Knapsack DP table has n items × W capacity cells, each computed in O(1): total O(nW).",
    difficulty: "medium",
    eloRating: 1500,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q60",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "Which of the following is TRUE about the no-free-lunch theorem in machine learning?",
    options: [
      "There exists one algorithm that outperforms all others on every problem",
      "Averaged over all possible problems, no algorithm outperforms any other",
      "Deep learning is always superior to shallow models",
      "More data always leads to better model performance",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "The No-Free-Lunch theorem states that averaged over all possible data distributions, no learning algorithm outperforms any other — algorithm choice should be domain-specific.",
    difficulty: "hard",
    eloRating: 1650,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q61",
    subjectId: "data-science-ai",
    topicId: "deep-learning",
    question:
      "In multi-head attention with h heads and model dimension d_model, each head uses key/query/value dimensions of:",
    options: ["d_model", "d_model / 2", "d_model / h", "h × d_model"],
    correctAnswer: 2,
    type: "mcq",
    explanation:
      "Multi-head attention uses d_k = d_v = d_model/h per head, so total computation across heads matches a single attention of d_model.",
    difficulty: "hard",
    eloRating: 1700,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q62",
    subjectId: "data-science-ai",
    topicId: "probability",
    question:
      "The law of total expectation states: E[X] =",
    options: [
      "E[X | Y] + E[Y]",
      "E[E[X | Y]]",
      "E[X | Y] × P(Y)",
      "E[X] × E[Y]",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Law of total expectation (tower property): E[X] = E[E[X|Y]], where the outer expectation is over Y.",
    difficulty: "hard",
    eloRating: 1650,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q63",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "Shapley values in explainable AI (SHAP) provide:",
    options: [
      "Global feature importance from a single decision tree",
      "A game-theoretic, fair allocation of each feature's contribution to a prediction",
      "Confidence intervals for neural network outputs",
      "A ranking of hyperparameters by importance",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "SHAP values compute each feature's average marginal contribution across all possible feature subsets, based on cooperative game theory.",
    difficulty: "hard",
    eloRating: 1700,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q64",
    subjectId: "data-science-ai",
    topicId: "statistics",
    question:
      "The KL divergence D_KL(P || Q) measures:",
    options: [
      "The Euclidean distance between two distributions",
      "How much information is lost when Q is used to approximate P",
      "The correlation between distributions P and Q",
      "The symmetric distance between P and Q",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "KL divergence D_KL(P||Q) = Σ P(x) log(P(x)/Q(x)) measures extra bits needed to encode P using Q. It is asymmetric.",
    difficulty: "hard",
    eloRating: 1700,
    marks: 2,
    negativeMarks: 0.67,
  },
  {
    id: "daMock7-q65",
    subjectId: "data-science-ai",
    topicId: "machine-learning",
    question:
      "Causal inference differs from standard machine learning in that it aims to:",
    options: [
      "Predict outcomes more accurately using larger datasets",
      "Estimate the effect of interventions (do-calculus), not just statistical associations",
      "Reduce the dimensionality of the feature space",
      "Improve generalisation by increasing regularisation",
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation:
      "Causal inference (do-calculus, Pearl's framework) estimates causal effects P(Y|do(X)) from interventions, beyond mere correlation P(Y|X).",
    difficulty: "hard",
    eloRating: 1750,
    marks: 2,
    negativeMarks: 0.67,
  },
];
