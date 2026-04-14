export interface Topic {
  id: string;
  name: string;
  description: string;
  youtubeVideos: { title: string; url: string; channel: string }[];
  notes: string[];
  slides: string[];
}

export interface Subject {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  color: string;
  topics: Topic[];
}

export const subjects: Subject[] = [
  {
    id: "general-aptitude",
    name: "General Aptitude",
    shortName: "GA",
    description: "Verbal, quantitative, and logical reasoning questions used in the GATE DA papers",
    icon: "BookOpen",
    color: "24 95% 58%",
    topics: [
      {
        id: "ga-verbal-reasoning",
        name: "Verbal Reasoning",
        description: "Analogy, reading comprehension, sentence logic, and word relationships",
        youtubeVideos: [
          { title: "GATE Verbal Aptitude Practice", url: "https://youtube.com/watch?v=example-ga-1", channel: "Gate Smashers" },
        ],
        notes: [
          "Look for tone, order, and direct evidence in passage-based questions.",
          "Analogy questions usually test relationship, sequence, or intensity.",
          "Eliminate choices that add information not supported by the statement.",
        ],
        slides: [
          "Step 1: Read the stem carefully and identify the exact relationship being tested.",
          "Step 2: Eliminate extreme or unsupported answer choices first.",
          "Step 3: Re-check the surviving choice against every part of the statement.",
        ],
      },
      {
        id: "ga-quantitative-aptitude",
        name: "Quantitative Aptitude",
        description: "Arithmetic, algebraic manipulation, geometry, and quick calculation",
        youtubeVideos: [
          { title: "Quantitative Aptitude for GATE", url: "https://youtube.com/watch?v=example-ga-2", channel: "Neso Academy" },
        ],
        notes: [
          "Translate word problems into equations before calculating.",
          "Check units and ratios before choosing an answer option.",
          "Use approximation smartly when options are well separated.",
        ],
        slides: [
          "Step 1: Identify whether the problem is arithmetic, algebra, or geometry.",
          "Step 2: Write the governing equation and simplify before substituting numbers.",
          "Step 3: Verify the final value against the question wording and units.",
        ],
      },
      {
        id: "ga-logical-reasoning",
        name: "Logical Reasoning",
        description: "Patterns, grids, inference, and constraint-based reasoning",
        youtubeVideos: [
          { title: "Logical Reasoning for GATE", url: "https://youtube.com/watch?v=example-ga-3", channel: "Unacademy GATE" },
        ],
        notes: [
          "Track constraints systematically instead of guessing from the figure.",
          "For pattern questions, test row-wise, column-wise, and diagonal rules.",
          "Use small tables or state diagrams when the puzzle evolves step by step.",
        ],
        slides: [
          "Step 1: Write down the initial condition and the update rule clearly.",
          "Step 2: Test the rule on a small subset before extending the pattern.",
          "Step 3: Use elimination when only one option remains consistent.",
        ],
      },
    ],
  },
  {
    id: "linear-algebra",
    name: "Linear Algebra",
    shortName: "LA",
    description: "Matrices, eigenvalues, vector spaces, linear transformations",
    icon: "Grid3X3",
    color: "217 91% 52%",
    topics: [
      {
        id: "la-matrices",
        name: "Matrices & Determinants",
        description: "Types of matrices, determinant properties, inverse, rank",
        youtubeVideos: [
          { title: "Matrices Complete Revision for GATE", url: "https://www.youtube.com/watch?v=0oGJTQCy4cQ&list=PLi5giWKc4eO1G8oX3ft8ZuLQr4Y4idgng", channel: "Khan Academy" },
          { title: "Determinants Made Easy", url: "https://www.youtube.com/watch?v=3ROzG6n4yMc", channel: "The Organic Chemistry Tutor" },
        ],
        notes: [
          "A matrix is a rectangular array of numbers arranged in rows and columns.",
          "Determinant of a 2x2 matrix [[a,b],[c,d]] = ad - bc",
          "A matrix is invertible iff its determinant is non-zero.",
          "Rank of a matrix = number of non-zero rows in row echelon form.",
        ],
        slides: [
          "Step 1: Understand matrix types — Square, Symmetric, Skew-Symmetric, Orthogonal, Idempotent",
          "Step 2: Learn determinant computation — Cofactor expansion along any row/column",
          "Step 3: Row reduction to Echelon form — Swap, scale, add rows",
          "Step 4: Finding inverse — Using adjoint method or row reduction [A|I] → [I|A⁻¹]",
        ],
      },
      {
        id: "la-eigenvalues",
        name: "Eigenvalues & Eigenvectors",
        description: "Characteristic equation, diagonalization, spectral decomposition",
        youtubeVideos: [
          { title: "Eigenvalues & Eigenvectors for GATE", url: "https://www.youtube.com/watch?v=PFDu9oVAE-g", channel: "3Blue1Brown" },
          { title: "Eigenvalues & Eigenvectors for GATE", url: "https://www.youtube.com/watch?v=PhfbEr2btGQ&list=PL472D7015831DBF51", channel: "Khan Academy" },
        ],
        notes: [
          "Eigenvalue λ satisfies det(A - λI) = 0",
          "Sum of eigenvalues = Trace(A), Product of eigenvalues = det(A)",
          "A matrix is diagonalizable if it has n linearly independent eigenvectors.",
        ],
        slides: [
          "Step 1: Write characteristic equation det(A - λI) = 0",
          "Step 2: Solve for eigenvalues λ",
          "Step 3: For each λ, solve (A - λI)x = 0 to find eigenvectors",
          "Step 4: If n independent eigenvectors exist, P⁻¹AP = D (diagonal)",
        ],
      },
      {
        id: "la-vector-spaces",
        name: "Vector Spaces",
        description: "Basis, dimension, linear independence, subspaces",
        youtubeVideos: [
          { title: "Vector Spaces Complete Guide", url: "https://www.youtube.com/watch?v=br7tS1t2SFE", channel: "Khan Academy" },
          { title: "Linear Subspaces", url: "https://www.youtube.com/watch?v=pMFv6liWK4M", channel: "Khan Academy" },
        ],
        notes: [
          "A vector space must be closed under addition and scalar multiplication.",
          "Basis: a linearly independent spanning set.",
          "Dimension = number of vectors in any basis.",
        ],
        slides: [
          "Step 1: Check closure under addition and scalar multiplication",
          "Step 2: Verify linear independence using determinant or row reduction",
          "Step 3: Find basis by reducing to echelon form",
          "Step 4: Dimension = number of pivot columns",
        ],
      },
    ],
  },
  {
    id: "probability-statistics",
    name: "Probability & Statistics",
    shortName: "P&S",
    description: "Random variables, distributions, Bayesian inference, hypothesis testing",
    icon: "BarChart3",
    color: "142 71% 45%",
    topics: [
      {
        id: "ps-probability",
        name: "Probability Basics",
        description: "Conditional probability, Bayes theorem, independence",
        youtubeVideos: [
          { title: "Probability for GATE - Complete", url: "https://youtube.com/watch?v=example5", channel: "Gate Smashers" },
        ],
        notes: [
          "P(A|B) = P(A∩B)/P(B) — Conditional Probability",
          "Bayes Theorem: P(A|B) = P(B|A)P(A)/P(B)",
          "Events A, B independent iff P(A∩B) = P(A)·P(B)",
        ],
        slides: [
          "Step 1: Define sample space and events",
          "Step 2: Apply addition/multiplication rules",
          "Step 3: Use Bayes theorem for posterior probability",
          "Step 4: Check independence conditions",
        ],
      },
      {
        id: "ps-distributions",
        name: "Probability Distributions",
        description: "Normal, Binomial, Poisson, Exponential distributions",
        youtubeVideos: [
          { title: "All Distributions for GATE", url: "https://youtube.com/watch?v=example6", channel: "Neso Academy" },
        ],
        notes: [
          "Binomial: n trials, probability p, X~B(n,p), E[X]=np, Var(X)=np(1-p)",
          "Poisson: λ events per interval, P(X=k) = e^(-λ)λ^k/k!",
          "Normal: bell-shaped, N(μ,σ²), 68-95-99.7 rule",
        ],
        slides: [
          "Step 1: Identify distribution type from problem statement",
          "Step 2: Write PDF/PMF with given parameters",
          "Step 3: Compute E[X] and Var(X)",
          "Step 4: Use standard tables or formulas for probabilities",
        ],
      },
      {
        id: "ps-hypothesis",
        name: "Hypothesis Testing",
        description: "t-test, chi-square, p-values, confidence intervals",
        youtubeVideos: [
          { title: "Hypothesis Testing Made Simple", url: "https://youtube.com/watch?v=example7", channel: "StatQuest" },
        ],
        notes: [
          "H₀ = null hypothesis, H₁ = alternative hypothesis",
          "Type I error (α): Rejecting H₀ when it's true",
          "Type II error (β): Failing to reject H₀ when it's false",
          "p-value < α → reject H₀",
        ],
        slides: [
          "Step 1: State H₀ and H₁",
          "Step 2: Choose significance level α",
          "Step 3: Compute test statistic",
          "Step 4: Compare with critical value or p-value → decision",
        ],
      },
    ],
  },
  {
    id: "calculus-optimization",
    name: "Calculus & Optimization",
    shortName: "CO",
    description: "Differentiation, integration, gradient descent, convex optimization",
    icon: "TrendingUp",
    color: "28 90% 55%",
    topics: [
      {
        id: "co-differentiation",
        name: "Differentiation",
        description: "Limits, continuity, partial derivatives, chain rule",
        youtubeVideos: [
          { title: "Calculus for GATE Complete", url: "https://youtube.com/watch?v=example8", channel: "Gate Smashers" },
        ],
        notes: [
          "Chain rule: d/dx[f(g(x))] = f'(g(x))·g'(x)",
          "Partial derivative: differentiate w.r.t. one variable, treat others as constants",
          "Gradient: ∇f = [∂f/∂x₁, ∂f/∂x₂, ..., ∂f/∂xₙ]",
        ],
        slides: [
          "Step 1: Check continuity at the point",
          "Step 2: Apply differentiation rules (product, quotient, chain)",
          "Step 3: For multivariable — compute partial derivatives",
          "Step 4: Gradient points in direction of steepest ascent",
        ],
      },
      {
        id: "co-integration",
        name: "Integration",
        description: "Definite & indefinite integrals, multiple integrals",
        youtubeVideos: [
          { title: "Integration Tricks for GATE", url: "https://youtube.com/watch?v=example9", channel: "Neso Academy" },
        ],
        notes: [
          "∫xⁿ dx = xⁿ⁺¹/(n+1) + C for n ≠ -1",
          "Integration by parts: ∫u dv = uv - ∫v du",
          "Substitution: replace complex inner function with u",
        ],
        slides: [
          "Step 1: Identify integral type (polynomial, trig, exponential)",
          "Step 2: Try substitution or by-parts",
          "Step 3: For definite integrals, apply limits",
          "Step 4: Double/triple integrals — iterate from innermost",
        ],
      },
      {
        id: "co-optimization",
        name: "Optimization",
        description: "Gradient descent, convexity, Lagrange multipliers",
        youtubeVideos: [
          { title: "Optimization for ML and GATE", url: "https://youtube.com/watch?v=example10", channel: "StatQuest" },
        ],
        notes: [
          "Gradient Descent: θ = θ - α·∇f(θ), α = learning rate",
          "Convex function: f(λx + (1-λ)y) ≤ λf(x) + (1-λ)f(y)",
          "Lagrange: optimize f(x) subject to g(x)=0 using L = f - λg",
        ],
        slides: [
          "Step 1: Check if function is convex (Hessian positive semi-definite)",
          "Step 2: For unconstrained — set gradient to zero or use gradient descent",
          "Step 3: For constrained — form Lagrangian L = f - λg",
          "Step 4: Solve ∇L = 0 for optimal point and multiplier",
        ],
      },
    ],
  },
  {
    id: "machine-learning",
    name: "Machine Learning",
    shortName: "ML",
    description: "Supervised, unsupervised, neural networks, model evaluation",
    icon: "Brain",
    color: "280 65% 55%",
    topics: [
      {
        id: "ml-supervised",
        name: "Supervised Learning",
        description: "Regression, classification, SVM, decision trees",
        youtubeVideos: [
          { title: "Supervised Learning Complete for GATE", url: "https://youtube.com/watch?v=example11", channel: "Gate Smashers" },
        ],
        notes: [
          "Linear Regression: y = wᵀx + b, minimize MSE",
          "Logistic Regression: P(y=1|x) = σ(wᵀx + b)",
          "SVM: maximize margin = 2/‖w‖, kernel trick for non-linear",
          "Decision Trees: split on feature maximizing information gain",
        ],
        slides: [
          "Step 1: Understand problem type — regression vs classification",
          "Step 2: Choose model based on data linearity",
          "Step 3: Train by minimizing loss function",
          "Step 4: Evaluate with appropriate metric (MSE, accuracy, F1)",
        ],
      },
      {
        id: "ml-unsupervised",
        name: "Unsupervised Learning",
        description: "Clustering, PCA, dimensionality reduction",
        youtubeVideos: [
          { title: "K-Means & PCA for GATE", url: "https://youtube.com/watch?v=example12", channel: "StatQuest" },
        ],
        notes: [
          "K-Means: assign points to nearest centroid, update centroids, repeat",
          "PCA: project data onto top eigenvectors of covariance matrix",
          "Elbow method: plot within-cluster sum of squares vs K",
        ],
        slides: [
          "Step 1: Choose number of clusters K (elbow method)",
          "Step 2: Initialize centroids, assign, update iteratively",
          "Step 3: For PCA — standardize, compute covariance, find eigenvectors",
          "Step 4: Project onto top-k principal components",
        ],
      },
      {
        id: "ml-evaluation",
        name: "Model Evaluation",
        description: "Bias-variance, cross-validation, ROC, confusion matrix",
        youtubeVideos: [
          { title: "Model Evaluation Metrics GATE", url: "https://youtube.com/watch?v=example13", channel: "Neso Academy" },
        ],
        notes: [
          "Precision = TP/(TP+FP), Recall = TP/(TP+FN)",
          "F1 = 2·Precision·Recall/(Precision+Recall)",
          "AUC-ROC: area under TPR vs FPR curve",
          "K-fold CV: split data into K parts, train on K-1, test on 1",
        ],
        slides: [
          "Step 1: Build confusion matrix from predictions",
          "Step 2: Compute precision, recall, F1-score",
          "Step 3: Plot ROC curve, compute AUC",
          "Step 4: Use cross-validation to estimate generalization",
        ],
      },
    ],
  },
  {
    id: "artificial-intelligence",
    name: "Artificial Intelligence",
    shortName: "AI",
    description: "Search algorithms, logic, planning, knowledge representation",
    icon: "Lightbulb",
    color: "340 65% 50%",
    topics: [
      {
        id: "ai-search",
        name: "Search Algorithms",
        description: "BFS, DFS, A*, heuristics, adversarial search",
        youtubeVideos: [
          { title: "AI Search Algorithms for GATE", url: "https://youtube.com/watch?v=example14", channel: "Gate Smashers" },
        ],
        notes: [
          "BFS: explores level by level, complete, optimal for uniform cost",
          "DFS: explores depth first, may not terminate in infinite spaces",
          "A*: f(n) = g(n) + h(n), optimal if h is admissible & consistent",
        ],
        slides: [
          "Step 1: Model problem as state space graph",
          "Step 2: Choose uninformed (BFS/DFS) or informed (A*) strategy",
          "Step 3: Apply search with open/closed lists",
          "Step 4: Verify optimality conditions for chosen algorithm",
        ],
      },
      {
        id: "ai-logic",
        name: "Propositional & Predicate Logic",
        description: "Inference rules, resolution, first-order logic",
        youtubeVideos: [
          { title: "Logic for AI - GATE Preparation", url: "https://youtube.com/watch?v=example15", channel: "Neso Academy" },
        ],
        notes: [
          "Propositional logic: AND, OR, NOT, IMPLIES, IFF",
          "Predicate logic adds quantifiers: ∀ (for all), ∃ (exists)",
          "Resolution: convert to CNF, apply resolution rule",
        ],
        slides: [
          "Step 1: Translate natural language to logical statements",
          "Step 2: Apply inference rules (modus ponens, resolution)",
          "Step 3: Convert to CNF for resolution proofs",
          "Step 4: Check satisfiability or prove entailment",
        ],
      },
    ],
  },
  {
    id: "programming-dsa",
    name: "Programming & DSA",
    shortName: "DSA",
    description: "Python, data structures, algorithms, complexity analysis",
    icon: "Code",
    color: "170 60% 40%",
    topics: [
      {
        id: "dsa-arrays",
        name: "Arrays & Strings",
        description: "Operations, searching, sorting, pattern matching",
        youtubeVideos: [
          { title: "Arrays & Strings for GATE", url: "https://youtube.com/watch?v=example16", channel: "Gate Smashers" },
        ],
        notes: [
          "Array: contiguous memory, O(1) access, O(n) insert/delete",
          "Binary search: O(log n) on sorted array",
          "KMP pattern matching: O(n+m) using failure function",
        ],
        slides: [
          "Step 1: Understand array operations and complexities",
          "Step 2: Master binary search variants",
          "Step 3: Learn string matching algorithms (KMP, Rabin-Karp)",
          "Step 4: Practice two-pointer and sliding window techniques",
        ],
      },
      {
        id: "dsa-trees",
        name: "Trees & Graphs",
        description: "BST, AVL, BFS/DFS, shortest paths, MST",
        youtubeVideos: [
          { title: "Trees & Graphs Complete GATE", url: "https://youtube.com/watch?v=example17", channel: "Gate Smashers" },
        ],
        notes: [
          "BST: left < root < right, search/insert O(log n) average",
          "AVL: self-balancing BST with balance factor {-1, 0, 1}",
          "Dijkstra: single source shortest path, O(V² or (V+E)logV)",
          "MST: Kruskal (sort edges) or Prim (grow from vertex)",
        ],
        slides: [
          "Step 1: Understand tree traversals (inorder, preorder, postorder)",
          "Step 2: BST operations — insert, delete, search",
          "Step 3: Graph representations — adjacency list vs matrix",
          "Step 4: Shortest path (Dijkstra, Bellman-Ford) and MST (Kruskal, Prim)",
        ],
      },
      {
        id: "dsa-complexity",
        name: "Complexity Analysis",
        description: "Big-O, recurrence relations, amortized analysis",
        youtubeVideos: [
          { title: "Time Complexity Analysis GATE", url: "https://youtube.com/watch?v=example18", channel: "Neso Academy" },
        ],
        notes: [
          "O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2ⁿ)",
          "Master theorem: T(n) = aT(n/b) + f(n)",
          "Amortized: average cost per operation over worst-case sequence",
        ],
        slides: [
          "Step 1: Count dominant operations in loops",
          "Step 2: For recursion — write recurrence relation",
          "Step 3: Apply Master theorem or substitution method",
          "Step 4: Compare with known complexities of standard algorithms",
        ],
      },
    ],
  },
  {
    id: "dbms",
    name: "Database Management Systems",
    shortName: "DBMS",
    description: "SQL, normalization, transactions, indexing",
    icon: "Database",
    color: "200 65% 45%",
    topics: [
      {
        id: "dbms-sql",
        name: "SQL & Relational Algebra",
        description: "Queries, joins, aggregation, relational operators",
        youtubeVideos: [
          { title: "SQL for GATE - Complete", url: "https://youtube.com/watch?v=example19", channel: "Gate Smashers" },
        ],
        notes: [
          "SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY",
          "JOIN types: INNER, LEFT, RIGHT, FULL OUTER, CROSS",
          "Relational Algebra: σ (select), π (project), ⋈ (join), ∪, ∩, −",
        ],
        slides: [
          "Step 1: Write basic SELECT queries",
          "Step 2: Master JOIN operations with multiple tables",
          "Step 3: Use GROUP BY with aggregate functions",
          "Step 4: Convert between SQL and Relational Algebra",
        ],
      },
      {
        id: "dbms-normalization",
        name: "Normalization",
        description: "1NF, 2NF, 3NF, BCNF, functional dependencies",
        youtubeVideos: [
          { title: "Normalization Made Easy GATE", url: "https://youtube.com/watch?v=example20", channel: "Gate Smashers" },
        ],
        notes: [
          "1NF: atomic values, no repeating groups",
          "2NF: 1NF + no partial dependencies",
          "3NF: 2NF + no transitive dependencies",
          "BCNF: every determinant is a candidate key",
        ],
        slides: [
          "Step 1: Identify all functional dependencies",
          "Step 2: Find candidate keys using closure",
          "Step 3: Check for partial & transitive dependencies",
          "Step 4: Decompose to achieve desired normal form losslessly",
        ],
      },
    ],
  },
];

export const visibleSubjects = subjects.filter((subject) => subject.id !== "general-aptitude");

export function getSubjectById(id: string) {
  return subjects.find((s) => s.id === id);
}

export function getTopicById(subjectId: string, topicId: string) {
  const subject = getSubjectById(subjectId);
  return subject?.topics.find((t) => t.id === topicId);
}

export function getAllTopics() {
  return subjects.flatMap((s) => s.topics.map((t) => ({ ...t, subjectId: s.id, subjectName: s.name })));
}

export function getVisibleTopics() {
  return visibleSubjects.flatMap((s) => s.topics.map((t) => ({ ...t, subjectId: s.id, subjectName: s.name })));
}
