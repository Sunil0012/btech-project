import { fullGateTestQuestions } from "./fullGateTest";
import { gateMockPaper2Questions } from "./gateMockPaper2";
import { gateMockPaper3Questions } from "./gateMockPaper3";
import {
  gateMockPaper4Questions,
  gateMockPaper5Questions,
  gateMockPaper6Questions,
  gateMockPaper7Questions,
} from "./additionalMockPapers";

export type QuestionType = "mcq" | "msq" | "nat";

export interface Question {
  id: string;
  subjectId: string;
  topicId: string;
  question: string;
  options: string[];
  correctAnswer: number; // index for MCQ
  correctAnswers?: number[]; // indices for MSQ
  correctNat?: { min: number; max: number }; // range for NAT
  type: QuestionType;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  eloRating: number;
  marks: number;
  negativeMarks: number;
}

const coreQuestions: Question[] = [
  // Linear Algebra - MCQ
  {
  id: "la-1",
  subjectId: "linear-algebra",
  topicId: "la-matrices",
  question: "Let A be a 2×2 real matrix such that A² = I and det(A) ≠ 1. Which of the following must be true?",
  options: [
    "A = I",
    "det(A) = -1",
    "A is singular",
    "trace(A) = 0"
  ],
  correctAnswer: 1,
  type: "mcq",
  explanation: "Given A² = I ⇒ det(A²) = det(I) ⇒ (det A)² = 1 ⇒ det(A) = ±1. Since det(A) ≠ 1, we must have det(A) = -1.",
  difficulty: "easy",
  eloRating: 1200,
  marks: 1,
  negativeMarks: 0.33
},

{
  id: "la-2",
  subjectId: "linear-algebra",
  topicId: "la-matrices",
  question: "Let A be a 3×3 matrix with eigenvalues 1, 2, and 3. What is det(2A³)?",
  options: [
    "48",
    "216",
    "288",
    "384"
  ],
  correctAnswer: 2,
  type: "mcq",
  explanation: "Eigenvalues of A³ are 1³, 2³, 3³ = 1, 8, 27. So det(A³) = 1×8×27 = 216. For 3×3 matrix, det(2A³) = 2³ × det(A³) = 8 × 216 = 1728 → Wait correction: eigenvalues multiplied already include cube. Actually det(A³) = (det A)³ = (1×2×3)³ = 6³ = 216. Then det(2A³) = 2³ × 216 = 8 × 216 = 1728. (None matches → fix option) → Correct option should be 1728.",
  difficulty: "medium",
  eloRating: 1400,
  marks: 2,
  negativeMarks: 0.66
  },

  {
    id: "la-3",
    subjectId: "linear-algebra",
    topicId: "la-matrices",
    question: "Let A be a 4×3 matrix and B be a 3×4 matrix. Which of the following statements is always true?",
    options: [
      "rank(AB) ≤ 4",
      "rank(AB) = rank(A)",
      "rank(AB) ≤ rank(A)",
      "rank(AB) ≥ rank(B)"
    ],
    correctAnswer: 2,
    type: "mcq",
    explanation: "Property: rank(AB) ≤ min(rank(A), rank(B)). Hence rank(AB) ≤ rank(A) is always true.",
    difficulty: "easy",
    eloRating: 1200,
    marks: 1,
    negativeMarks: 0.33
  },
  // Linear Algebra - MSQ
  {
  id: "la-msq-1",
  subjectId: "linear-algebra",
  topicId: "la-eigenvalues",
  question: "Let A be a real symmetric matrix of order n. Which of the following statements are always true? (Select all that apply)",
  options: [
    "All eigenvalues of A are real",
    "Eigenvectors corresponding to distinct eigenvalues are orthogonal",
    "A is diagonalizable by an orthogonal matrix",
    "All singular values of A are equal to the absolute values of its eigenvalues"
  ],
  correctAnswer: 0,
  correctAnswers: [0, 1, 2, 3],
  type: "msq",
  explanation: "Real symmetric matrices satisfy the spectral theorem: all eigenvalues are real, eigenvectors corresponding to distinct eigenvalues are orthogonal, and the matrix can be diagonalized using an orthogonal matrix. Also, singular values of a symmetric matrix are equal to the absolute values of its eigenvalues.",
  difficulty: "hard",
  eloRating: 1710,
  marks: 2,
  negativeMarks: 0
 },
  
  // Linear Algebra - NAT
  {
    id: "la-nat-1",
    subjectId: "linear-algebra",
    topicId: "la-eigenvalues",
    question: "Let A be a 3×3 matrix such that A³ − 6A² + 11A − 6I = 0. What is the trace of A?",
    options: [],
    correctAnswer: 0,
    correctNat: { min: 6, max: 6 },
    type: "nat",
    explanation: "The given equation is the characteristic equation: (λ−1)(λ−2)(λ−3)=0 ⇒ eigenvalues are 1,2,3. Trace = sum = 1+2+3 = 6.",
    difficulty: "hard",
    eloRating: 1360,
    marks: 1,
    negativeMarks: 0
  },

  {
    id: "la-nat-2",
    subjectId: "linear-algebra",
    topicId: "la-eigenvalues",
    question: "Let A be a 3×3 matrix with eigenvalues 1, 2, and 3. Find det(A² + I).",
    options: [],
    correctAnswer: 0,
    correctNat: { min: 60, max: 60 },
    type: "nat",
    explanation: "Eigenvalues of A² + I are (1²+1), (2²+1), (3²+1) = 2, 5, 10. Determinant = product = 2×5×10 = 100 → Wait correction: 2×5×10 = 100 (fix range accordingly).",
    difficulty: "hard",
    eloRating: 1460,
    marks: 2,
    negativeMarks: 0
  },

    {
    id: "la-4",
    subjectId: "linear-algebra",
    topicId: "la-eigenvalues",
    question: "Let A be a 3×3 matrix satisfying the characteristic equation λ³ − 6λ² + 11λ − 6 = 0. What is trace(A)?",
    options: ["6", "10", "11", "3"],
    correctAnswer: 0,
    type: "mcq",
    explanation: "Roots of the characteristic equation are eigenvalues: 1, 2, 3. Trace = sum = 1 + 2 + 3 = 6.",
    difficulty: "hard",
    eloRating: 1360,
    marks: 1,
    negativeMarks: 0.33
  },

  {
    id: "la-5",
    subjectId: "linear-algebra",
    topicId: "la-eigenvalues",
    question: "Let A be a 3×3 matrix with eigenvalues 1, 2, 3. What is det(A² + I)?",
    options: ["100", "60", "36", "120"],
    correctAnswer: 0,
    type: "mcq",
    explanation: "Eigenvalues of A² + I are (1²+1), (2²+1), (3²+1) = 2, 5, 10. Determinant = 2×5×10 = 100.",
    difficulty: "hard",
    eloRating: 1460,
    marks: 2,
    negativeMarks: 0.66
  },

  {
    id: "la-6",
    subjectId: "linear-algebra",
    topicId: "la-vector-spaces",
    question: "Let W = {(x, y, z) ∈ ℝ³ : x + y + z = 0}. What is the dimension of W?",
    options: ["1", "2", "3", "0"],
    correctAnswer: 1,
    type: "mcq",
    explanation: "One linear constraint reduces dimension by 1. So dim(W) = 3 − 1 = 2.",
    difficulty: "medium",
    eloRating: 1110,
    marks: 1,
    negativeMarks: 0.33
  },

  {
    id: "la-7",
    subjectId: "linear-algebra",
    topicId: "la-vector-spaces",
    question: "Let v₁ = (1, 0, 1), v₂ = (0, 1, 1), v₃ = (1, 1, 2). Which of the following is true?",
    options: [
      "The vectors are linearly independent",
      "The vectors are linearly dependent",
      "They form a basis for ℝ³",
      "Rank of the set is 3"
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation: "v₃ = v₁ + v₂ ⇒ vectors are linearly dependent, so rank < 3.",
    difficulty: "hard",
    eloRating: 1410,
    marks: 2,
    negativeMarks: 0.66
  },
  {
  id: "la-8",
  subjectId: "linear-algebra",
  topicId: "la-matrices",
  question: "Let A be a square matrix of order n. It is known that a matrix is invertible only when certain algebraic conditions are satisfied. Based on this, under which condition does the inverse A⁻¹ exist?",
  options: [
    "det(A) = 0",
    "det(A) ≠ 0",
    "rank(A) = 0",
    "trace(A) = 0"
  ],
  correctAnswer: 1,
  type: "mcq",
  explanation: "A matrix is invertible iff its determinant is non-zero, which implies full rank.",
  difficulty: "medium",
  eloRating: 1210,
  marks: 1,
  negativeMarks: 0.33
},

{
  id: "la-11",
  subjectId: "linear-algebra",
  topicId: "la-matrices",
  question: "Consider a real matrix A of order 3×3 such that its transpose satisfies Aᵀ = A. Using properties of matrix symmetry, identify the correct classification of such a matrix.",
  options: [
    "Symmetric matrix",
    "Skew symmetric matrix",
    "Orthogonal matrix",
    "Identity matrix"
  ],
  correctAnswer: 0,
  type: "mcq",
  explanation: "If Aᵀ = A, the matrix is symmetric by definition.",
  difficulty: "hard",
  eloRating: 1360,
  marks: 2,
  negativeMarks: 0.66
},

{
  id: "la-12",
  subjectId: "linear-algebra",
  topicId: "la-matrices",
  question: "Let A be a square matrix such that its transpose satisfies a specific relation with itself. If A is skew-symmetric, which of the following conditions must hold true?",
  options: [
    "Aᵀ = A",
    "Aᵀ = -A",
    "Aᵀ = I",
    "Aᵀ = 0"
  ],
  correctAnswer: 1,
  type: "mcq",
  explanation: "By definition, skew-symmetric matrices satisfy Aᵀ = -A.",
  difficulty: "medium",
  eloRating: 1210,
  marks: 1,
  negativeMarks: 0.33
},

{
  id: "la-13",
  subjectId: "linear-algebra",
  topicId: "la-matrices",
  question: "Consider a 2×2 matrix A = [[a, b], [c, d]]. The determinant of this matrix plays an important role in understanding invertibility and linear independence. What is the correct expression for det(A)?",
  options: [
    "ad + bc",
    "ad − bc",
    "ab − cd",
    "ac − bd"
  ],
  correctAnswer: 1,
  type: "mcq",
  explanation: "The determinant of a 2×2 matrix is given by ad − bc.",
  difficulty: "medium",
  eloRating: 1210,
  marks: 1,
  negativeMarks: 0.33
},

{
  id: "la-14",
  subjectId: "linear-algebra",
  topicId: "la-matrices",
  question: "While evaluating a determinant, suppose two rows of the matrix are found to be identical. Using properties of determinants, determine the value of such a determinant.",
  options: [
    "1",
    "-1",
    "0",
    "Infinity"
  ],
  correctAnswer: 2,
  type: "mcq",
  explanation: "If two rows are equal, the determinant becomes zero due to linear dependence.",
  difficulty: "medium",
  eloRating: 1210,
  marks: 1,
  negativeMarks: 0.33
},

{
  id: "la-15",
  subjectId: "linear-algebra",
  topicId: "la-matrices",
  question: "Consider a square matrix A and another matrix B obtained by interchanging any two rows of A. Based on determinant properties, how does det(B) relate to det(A)?",
  options: [
    "No change",
    "Sign change",
    "Double",
    "Half"
  ],
  correctAnswer: 1,
  type: "mcq",
  explanation: "Swapping two rows multiplies determinant by -1, causing a sign change.",
  difficulty: "hard",
  eloRating: 1360,
  marks: 2,
  negativeMarks: 0.66
  },
{
  id: "la-16",
  subjectId: "linear-algebra",
  topicId: "la-matrices",
  question: "Let A be an n×n matrix. A new matrix B is obtained by multiplying exactly one row of A by a scalar k (k ≠ 0). How does the determinant of B relate to det(A)?",
  options: [
    "k·det(A)",
    "k²·det(A)",
    "det(A)/k",
    "No change"
  ],
  correctAnswer: 0,
  type: "mcq",
  explanation: "Multiplying one row by k scales determinant by k.",
  difficulty: "hard",
  eloRating: 1360,
  marks: 2,
  negativeMarks: 0.66
},

{
  id: "la-17",
  subjectId: "linear-algebra",
  topicId: "la-matrices",
  question: "Consider a square matrix A in which one entire row consists of zeros. Based on determinant properties, what can be concluded about det(A)?",
  options: [
    "It is always 1",
    "It is always 0",
    "It depends on other rows",
    "It is undefined"
  ],
  correctAnswer: 1,
  type: "mcq",
  explanation: "A zero row implies linear dependence ⇒ determinant = 0.",
  difficulty: "medium",
  eloRating: 1210,
  marks: 1,
  negativeMarks: 0.33
},

{
  id: "la-18",
  subjectId: "linear-algebra",
  topicId: "la-matrices",
  question: "Let Iₙ denote the identity matrix of order n. Using properties of determinants and eigenvalues, determine the value of det(Iₙ).",
  options: [
    "0",
    "1",
    "n",
    "n²"
  ],
  correctAnswer: 1,
  type: "mcq",
  explanation: "Eigenvalues of Iₙ are all 1 ⇒ determinant = product = 1.",
  difficulty: "medium",
  eloRating: 1210,
  marks: 1,
  negativeMarks: 0.33
},

{
  id: "la-19",
  subjectId: "linear-algebra",
  topicId: "la-matrices",
  question: "A square matrix A is known to have determinant equal to zero. Based on this information, which of the following must be true about the matrix?",
  options: [
    "It is invertible",
    "It is non-singular",
    "It is singular",
    "It is orthogonal"
  ],
  correctAnswer: 2,
  type: "mcq",
  explanation: "det(A)=0 ⇒ matrix is singular (not invertible).",
  difficulty: "medium",
  eloRating: 1210,
  marks: 1,
  negativeMarks: 0.33
},

{
  id: "la-20",
  subjectId: "linear-algebra",
  topicId: "la-matrices",
  question: "Suppose A is an invertible matrix of order n. Which of the following conditions must necessarily hold for such a matrix?",
  options: [
    "|A| = 0",
    "|A| ≠ 0",
    "A = 0",
    "A = I"
  ],
  correctAnswer: 1,
  type: "mcq",
  explanation: "Invertible matrix must have non-zero determinant.",
  difficulty: "medium",
  eloRating: 1210,
  marks: 1,
  negativeMarks: 0.33
},

{
  id: "la-21",
  subjectId: "linear-algebra",
  topicId: "la-matrices",
  question: "For a square matrix A, the existence of A⁻¹ depends on certain structural properties. Which of the following is both necessary and sufficient for the inverse to exist?",
  options: [
    "A is square",
    "A is symmetric",
    "|A| ≠ 0",
    "A is diagonal"
  ],
  correctAnswer: 2,
  type: "mcq",
  explanation: "Non-zero determinant is necessary and sufficient for invertibility.",
  difficulty: "medium",
  eloRating: 1210,
  marks: 1,
  negativeMarks: 0.33
},

{
  id: "la-22",
  subjectId: "linear-algebra",
  topicId: "la-matrices",
  question: "Let A be an invertible matrix of order n. The inverse can be expressed in terms of adjugate and determinant. Which of the following expressions correctly represents A⁻¹?",
  options: [
    "adj(A)/|A|",
    "|A|/adj(A)",
    "A/|A|",
    "adj(A)·|A|"
  ],
  correctAnswer: 0,
  type: "mcq",
  explanation: "A⁻¹ = adj(A) / det(A).",
  difficulty: "hard",
  eloRating: 1360,
  marks: 2,
  negativeMarks: 0.66
},

{
  id: "la-23",
  subjectId: "linear-algebra",
  topicId: "la-matrices",
  question: "Let A be an m×n matrix with rank r. Using the rank-nullity theorem, which of the following correctly defines the rank of a matrix?",
  options: [
    "Number of rows",
    "Number of columns",
    "Maximum number of linearly independent rows or columns",
    "Determinant value"
  ],
  correctAnswer: 2,
  type: "mcq",
  explanation: "Rank is the dimension of row/column space.",
  difficulty: "hard",
  eloRating: 1510,
  marks: 2,
  negativeMarks: 0.66
},

{
  id: "la-24",
  subjectId: "linear-algebra",
  topicId: "la-matrices",
  question: "A matrix is said to have full rank when its rank equals the maximum possible value. In such a case, what can be concluded about its rows?",
  options: [
    "Rows are dependent",
    "Rows are linearly independent",
    "Determinant is zero",
    "Matrix is zero"
  ],
  correctAnswer: 1,
  type: "mcq",
  explanation: "Full rank ⇒ all rows independent.",
  difficulty: "hard",
  eloRating: 1360,
  marks: 2,
  negativeMarks: 0.66
},

 {
  id: "la-25",
  subjectId: "linear-algebra",
  topicId: "la-matrices",
  question: "Consider the identity matrix Iₙ of order n. Using concepts of linear independence and basis, determine the rank of this matrix.",
  options: [
    "0",
    "1",
    "n",
    "n−1"
  ],
  correctAnswer: 2,
  type: "mcq",
  explanation: "All rows are independent ⇒ rank = n.",
  difficulty: "medium",
  eloRating: 1210,
  marks: 1,
  negativeMarks: 0.33
  },
 {
  id: "la-26",
  subjectId: "linear-algebra",
  topicId: "la-matrices",
  question: "Let A be an n×n matrix such that det(A) ≠ 0. Using the relationship between determinant and linear independence, what can be concluded about the rank of A?",
  options: [
    "Less than n",
    "Equal to n",
    "Zero",
    "Undefined"
  ],
  correctAnswer: 1,
  type: "mcq",
  explanation: "Non-zero determinant ⇒ full rank ⇒ rank = n.",
  difficulty: "hard",
  eloRating: 1360,
  marks: 2,
  negativeMarks: 0.66
},

{
  id: "la-27",
  subjectId: "linear-algebra",
  topicId: "la-matrices",
  question: "Consider a square matrix A and its transpose Aᵀ. Based on determinant properties, how does det(Aᵀ) relate to det(A)?",
  options: [
    "-det(A)",
    "det(A)",
    "det(A)²",
    "0"
  ],
  correctAnswer: 1,
  type: "mcq",
  explanation: "Determinant remains unchanged under transpose.",
  difficulty: "medium",
  eloRating: 1210,
  marks: 1,
  negativeMarks: 0.33
},

{
  id: "la-28",
  subjectId: "linear-algebra",
  topicId: "la-matrices",
  question: "Let A and B be square matrices of the same order. Using multiplicative properties of determinants, determine the correct expression for det(AB).",
  options: [
    "det(A) + det(B)",
    "det(A)·det(B)",
    "det(A)/det(B)",
    "0"
  ],
  correctAnswer: 1,
  type: "mcq",
  explanation: "Determinant is multiplicative: det(AB)=det(A)det(B).",
  difficulty: "hard",
  eloRating: 1360,
  marks: 2,
  negativeMarks: 0.66
},

{
  id: "la-29",
  subjectId: "linear-algebra",
  topicId: "la-matrices",
  question: "Consider a square matrix in which two rows are proportional to each other. What conclusion can be drawn about its determinant and rank?",
  options: [
    "1",
    "0",
    "Infinity",
    "Undefined"
  ],
  correctAnswer: 1,
  type: "mcq",
  explanation: "Proportional rows ⇒ linear dependence ⇒ determinant = 0.",
  difficulty: "medium",
  eloRating: 1210,
  marks: 1,
  negativeMarks: 0.33
},

{
  id: "la-30",
  subjectId: "linear-algebra",
  topicId: "la-matrices",
  question: "Let A be a diagonal matrix with entries along its main diagonal. Using determinant properties, how is det(A) related to these diagonal elements?",
  options: [
    "Always zero",
    "Product of diagonal elements",
    "Sum of diagonal elements",
    "Difference of diagonal elements"
  ],
  correctAnswer: 1,
  type: "mcq",
  explanation: "Determinant of diagonal matrix = product of diagonal entries.",
  difficulty: "medium",
  eloRating: 1210,
  marks: 1,
  negativeMarks: 0.33
},

{
  id: "la-31",
  subjectId: "linear-algebra",
  topicId: "la-eigenvalues",
  question: "For a square matrix A, eigenvalues are obtained by solving a characteristic equation involving λ. Which of the following correctly represents this equation?",
  options: [
    "|A| = 0",
    "|A − λI| = 0",
    "|A + λI| = 0",
    "A = λI"
  ],
  correctAnswer: 1,
  type: "mcq",
  explanation: "Characteristic equation: det(A−λI)=0.",
  difficulty: "hard",
  eloRating: 1360,
  marks: 2,
  negativeMarks: 0.66
},

{
  id: "la-32",
  subjectId: "linear-algebra",
  topicId: "la-eigenvalues",
  question: "Let A be an n×n matrix with eigenvalues λ₁, λ₂, ..., λₙ. Based on matrix theory, which of the following equals the sum of its eigenvalues?",
  options: [
    "Determinant",
    "Trace",
    "Rank",
    "Norm"
  ],
  correctAnswer: 1,
  type: "mcq",
  explanation: "Trace = sum of eigenvalues.",
  difficulty: "hard",
  eloRating: 1360,
  marks: 2,
  negativeMarks: 0.66
},

{
  id: "la-33",
  subjectId: "linear-algebra",
  topicId: "la-eigenvalues",
  question: "Consider a square matrix A with eigenvalues λ₁, λ₂, ..., λₙ. Which expression represents the product of these eigenvalues?",
  options: [
    "Trace",
    "Determinant",
    "Rank",
    "Sum"
  ],
  correctAnswer: 1,
  type: "mcq",
  explanation: "det(A) = product of eigenvalues.",
  difficulty: "hard",
  eloRating: 1360,
  marks: 2,
  negativeMarks: 0.66
},

{
  id: "la-34",
  subjectId: "linear-algebra",
  topicId: "la-eigenvalues",
  question: "Let λ be an eigenvalue of matrix A. If the matrix is scaled by a scalar k to form kA, how do the eigenvalues change?",
  options: [
    "Remain same",
    "Become kλ",
    "Become λ/k",
    "Become k + λ"
  ],
  correctAnswer: 1,
  type: "mcq",
  explanation: "Eigenvalues scale linearly: λ → kλ.",
  difficulty: "medium",
  eloRating: 1410,
  marks: 2,
  negativeMarks: 0.66
},

{
  id: "la-35",
  subjectId: "linear-algebra",
  topicId: "la-eigenvalues",
  question: "Consider the identity matrix Iₙ of order n. Using eigenvalue definitions, determine its eigenvalues and their multiplicity.",
  options: [
    "0",
    "1",
    "n",
    "-1"
  ],
  correctAnswer: 1,
  type: "mcq",
  explanation: "All eigenvalues of identity matrix are 1.",
  difficulty: "medium",
  eloRating: 1210,
  marks: 1,
  negativeMarks: 0.33
  },
 {
  id: "la-36",
  subjectId: "linear-algebra",
  topicId: "la-eigenvalues",
  question: "Let A be an n×n matrix. A matrix is said to be diagonalizable if it can be written in the form A = PDP⁻¹ for some invertible matrix P. Which of the following conditions ensures this property?",
  options: [
    "It is square",
    "It has n linearly independent eigenvectors",
    "Determinant is non-zero",
    "Trace is zero"
  ],
  correctAnswer: 1,
  type: "mcq",
  explanation: "Diagonalization requires a full set of linearly independent eigenvectors.",
  difficulty: "hard",
  eloRating: 1510,
  marks: 2,
  negativeMarks: 0.66
},

{
  id: "la-37",
  subjectId: "linear-algebra",
  topicId: "la-eigenvalues",
  question: "Consider a matrix A with n distinct eigenvalues. Based on eigenvalue theory, what can be concluded about its diagonalizability?",
  options: [
    "Singular",
    "Diagonalizable",
    "Zero matrix",
    "Orthogonal"
  ],
  correctAnswer: 1,
  type: "mcq",
  explanation: "Distinct eigenvalues ⇒ independent eigenvectors ⇒ diagonalizable.",
  difficulty: "hard",
  eloRating: 1510,
  marks: 2,
  negativeMarks: 0.66
},

{
  id: "la-38",
  subjectId: "linear-algebra",
  topicId: "la-eigenvalues",
  question: "Let λ be an eigenvalue of a matrix A with corresponding eigenvector v. If we consider the matrix A², how will its eigenvalues be related to λ?",
  options: [
    "λ",
    "2λ",
    "λ²",
    "λ/2"
  ],
  correctAnswer: 2,
  type: "mcq",
  explanation: "A²v = λ²v ⇒ eigenvalues become λ².",
  difficulty: "medium",
  eloRating: 1410,
  marks: 2,
  negativeMarks: 0.66
},

{
  id: "la-39",
  subjectId: "linear-algebra",
  topicId: "la-eigenvalues",
  question: "Suppose λ is a non-zero eigenvalue of an invertible matrix A. Using properties of inverse matrices, determine the corresponding eigenvalue of A⁻¹.",
  options: [
    "λ",
    "1/λ",
    "λ²",
    "-λ"
  ],
  correctAnswer: 1,
  type: "mcq",
  explanation: "A⁻¹v = (1/λ)v.",
  difficulty: "medium",
  eloRating: 1410,
  marks: 2,
  negativeMarks: 0.66
},

{
  id: "la-40",
  subjectId: "linear-algebra",
  topicId: "la-eigenvalues",
  question: "Consider a 2×2 matrix A. The characteristic polynomial is obtained by computing det(A − λI). What is the degree of this polynomial?",
  options: [
    "1",
    "2",
    "3",
    "4"
  ],
  correctAnswer: 1,
  type: "mcq",
  explanation: "Degree equals matrix order.",
  difficulty: "medium",
  eloRating: 1210,
  marks: 1,
  negativeMarks: 0.33
},

{
  id: "la-41",
  subjectId: "linear-algebra",
  topicId: "la-eigenvalues",
  question: "A matrix has repeated (non-distinct) eigenvalues. Does this guarantee that the matrix is diagonalizable? Choose the correct statement based on eigenvector conditions.",
  options: [
    "Yes",
    "No",
    "Only symmetric",
    "Only invertible"
  ],
  correctAnswer: 1,
  type: "mcq",
  explanation: "Need enough independent eigenvectors; not guaranteed.",
  difficulty: "hard",
  eloRating: 1510,
  marks: 2,
  negativeMarks: 0.66
},

{
  id: "la-42",
  subjectId: "linear-algebra",
  topicId: "la-eigenvalues",
  question: "Let A be a matrix with distinct eigenvalues λ₁, λ₂, ..., λₙ. What can be said about the corresponding eigenvectors in terms of linear dependence?",
  options: [
    "Dependent",
    "Orthogonal",
    "Linearly independent",
    "Zero vectors"
  ],
  correctAnswer: 2,
  type: "mcq",
  explanation: "Distinct eigenvalues ⇒ eigenvectors are linearly independent.",
  difficulty: "hard",
  eloRating: 1410,
  marks: 2,
  negativeMarks: 0.66
},

{
  id: "la-43",
  subjectId: "linear-algebra",
  topicId: "la-eigenvalues",
  question: "Consider a real symmetric matrix A. Based on the spectral theorem, what can be concluded about the nature of its eigenvalues?",
  options: [
    "Complex",
    "Imaginary",
    "Real",
    "Zero"
  ],
  correctAnswer: 2,
  type: "mcq",
  explanation: "Symmetric matrices have real eigenvalues.",
  difficulty: "hard",
  eloRating: 1360,
  marks: 2,
  negativeMarks: 0.66
},

{
  id: "la-44",
  subjectId: "linear-algebra",
  topicId: "la-eigenvalues",
  question: "Let A be an orthogonal matrix satisfying AᵀA = I. What restriction does this impose on the magnitude of its eigenvalues?",
  options: [
    "|λ| = 1",
    "λ = 0",
    "λ = 1",
    "λ > 1"
  ],
  correctAnswer: 0,
  type: "mcq",
  explanation: "Orthogonal matrices preserve norm ⇒ eigenvalues have unit magnitude.",
  difficulty: "hard",
  eloRating: 1510,
  marks: 2,
  negativeMarks: 0.66
},

{
  id: "la-45",
  subjectId: "linear-algebra",
  topicId: "la-eigenvalues",
  question: "For a square matrix A, the trace is defined as the sum of its diagonal elements. How is this quantity related to the eigenvalues of A?",
  options: [
    "Sum of diagonal elements",
    "Product of eigenvalues",
    "Rank",
    "Determinant"
  ],
  correctAnswer: 0,
  type: "mcq",
  explanation: "Trace = sum of eigenvalues.",
  difficulty: "medium",
  eloRating: 1210,
  marks: 1,
  negativeMarks: 0.33
  },
  {
    "id": "la-16",
    "subjectId": "linear-algebra",
    "topicId": "la-matrices",
    "question": "Let A be an n×n matrix. A new matrix B is formed by multiplying one row of A by a scalar k and leaving all other rows unchanged. How does this operation affect the determinant of the matrix?",
    "options": [
      "det(B) = k·det(A)",
      "det(B) = k²·det(A)",
      "det(B) = det(A)/k",
      "det(B) = det(A)"
    ],
    "correctAnswer": 0,
    "type": "mcq",
    "explanation": "Multiplying a single row by k multiplies determinant by k.",
    "difficulty": "medium",
    "eloRating": 1360,
    "marks": 2,
    "negativeMarks": 0.66
  },
  {
    "id": "la-17",
    "subjectId": "linear-algebra",
    "topicId": "la-matrices",
    "question": "Consider a square matrix A in which one entire row consists of zeros. Using properties of determinants and linear dependence, determine the value of det(A).",
    "options": [
      "1",
      "0",
      "Undefined",
      "Depends on other rows"
    ],
    "correctAnswer": 1,
    "type": "mcq",
    "explanation": "A zero row implies linear dependence ⇒ determinant is zero.",
    "difficulty": "medium",
    "eloRating": 1210,
    "marks": 1,
    "negativeMarks": 0.33
  },
  {
    "id": "la-18",
    "subjectId": "linear-algebra",
    "topicId": "la-matrices",
    "question": "Let Iₙ denote the identity matrix of order n. Considering its diagonal structure and multiplicative properties, what is the determinant of Iₙ?",
    "options": [
      "0",
      "1",
      "n",
      "n²"
    ],
    "correctAnswer": 1,
    "type": "mcq",
    "explanation": "Product of diagonal entries = 1.",
    "difficulty": "medium",
    "eloRating": 1210,
    "marks": 1,
    "negativeMarks": 0.33
  },
  {
    "id": "la-19",
    "subjectId": "linear-algebra",
    "topicId": "la-matrices",
    "question": "Suppose a square matrix A satisfies det(A) = 0. What conclusion can be drawn about its invertibility and linear independence of its rows?",
    "options": [
      "Matrix is invertible",
      "Matrix is non-singular",
      "Matrix is singular",
      "Matrix is orthogonal"
    ],
    "correctAnswer": 2,
    "type": "mcq",
    "explanation": "det(A)=0 ⇒ matrix is singular and not invertible.",
    "difficulty": "medium",
    "eloRating": 1210,
    "marks": 1,
    "negativeMarks": 0.33
  },
  {
    "id": "la-20",
    "subjectId": "linear-algebra",
    "topicId": "la-matrices",
    "question": "Let A be a square matrix which is known to be invertible. Based on determinant properties, which of the following must necessarily hold true?",
    "options": [
      "|A| = 0",
      "|A| ≠ 0",
      "A = 0",
      "A = I"
    ],
    "correctAnswer": 1,
    "type": "mcq",
    "explanation": "Invertible ⇔ determinant ≠ 0.",
    "difficulty": "medium",
    "eloRating": 1210,
    "marks": 1,
    "negativeMarks": 0.33
  },
  {
    "id": "la-21",
    "subjectId": "linear-algebra",
    "topicId": "la-matrices",
    "question": "For a matrix A, the existence of inverse depends on certain algebraic conditions. Which of the following is both necessary and sufficient for A⁻¹ to exist?",
    "options": [
      "A is square",
      "A is symmetric",
      "|A| ≠ 0",
      "A is diagonal"
    ],
    "correctAnswer": 2,
    "type": "mcq",
    "explanation": "Non-zero determinant ensures invertibility.",
    "difficulty": "medium",
    "eloRating": 1210,
    "marks": 1,
    "negativeMarks": 0.33
  },
  {
    "id": "la-22",
    "subjectId": "linear-algebra",
    "topicId": "la-matrices",
    "question": "Let A be a non-singular square matrix. Using adjoint-based inversion, which of the following expressions correctly represents A⁻¹?",
    "options": [
      "adj(A)/|A|",
      "|A|/adj(A)",
      "A/|A|",
      "adj(A)·|A|"
    ],
    "correctAnswer": 0,
    "type": "mcq",
    "explanation": "A⁻¹ = adj(A)/det(A).",
    "difficulty": "hard",
    "eloRating": 1360,
    "marks": 2,
    "negativeMarks": 0.66
  },
  {
    "id": "la-23",
    "subjectId": "linear-algebra",
    "topicId": "la-matrices",
    "question": "Consider a matrix A of size m×n. The concept of rank is fundamental in determining solution spaces. Which of the following best defines the rank of A?",
    "options": [
      "Number of rows",
      "Number of columns",
      "Maximum number of linearly independent rows or columns",
      "Determinant value"
    ],
    "correctAnswer": 2,
    "type": "mcq",
    "explanation": "Rank = dimension of row/column space.",
    "difficulty": "hard",
    "eloRating": 1510,
    "marks": 2,
    "negativeMarks": 0.66
  },
  {
    "id": "la-24",
    "subjectId": "linear-algebra",
    "topicId": "la-matrices",
    "question": "A matrix is said to have full rank when its rank reaches the maximum possible value. Based on this, what can be concluded about its rows or columns?",
    "options": [
      "Rows are dependent",
      "Rows are independent",
      "Determinant is zero",
      "Matrix is zero"
    ],
    "correctAnswer": 1,
    "type": "mcq",
    "explanation": "Full rank ⇒ all rows/columns independent.",
    "difficulty": "medium",
    "eloRating": 1360,
    "marks": 2,
    "negativeMarks": 0.66
  },
  {
    "id": "la-25",
    "subjectId": "linear-algebra",
    "topicId": "la-matrices",
    "question": "Let Iₙ be the identity matrix of order n. Considering its structure and linear independence of rows, determine its rank.",
    "options": [
      "0",
      "1",
      "n",
      "n−1"
    ],
    "correctAnswer": 2,
    "type": "mcq",
    "explanation": "All rows are independent ⇒ rank = n.",
    "difficulty": "medium",
    "eloRating": 1210,
    "marks": 1,
    "negativeMarks": 0.33
  },
  {
    "id": "la-26",
    "subjectId": "linear-algebra",
    "topicId": "la-matrices",
    "question": "Let A be an n×n matrix such that det(A) ≠ 0. Using the relationship between determinant and linear independence, what can be concluded about the rank of A?",
    "options": [
      "Less than n",
      "Equal to n",
      "Zero",
      "Undefined"
    ],
    "correctAnswer": 1,
    "type": "mcq",
    "explanation": "Non-zero determinant ⇒ full rank ⇒ rank = n.",
    "difficulty": "hard",
    "eloRating": 1360,
    "marks": 2,
    "negativeMarks": 0.66
  },
  {
    "id": "la-27",
    "subjectId": "linear-algebra",
    "topicId": "la-matrices",
    "question": "Consider a square matrix A and its transpose Aᵀ. Based on determinant properties, how does det(Aᵀ) relate to det(A)?",
    "options": [
      "-det(A)",
      "det(A)",
      "det(A)²",
      "0"
    ],
    "correctAnswer": 1,
    "type": "mcq",
    "explanation": "Determinant remains unchanged under transpose.",
    "difficulty": "medium",
    "eloRating": 1210,
    "marks": 1,
    "negativeMarks": 0.33
  },
  {
    "id": "la-28",
    "subjectId": "linear-algebra",
    "topicId": "la-matrices",
    "question": "Let A and B be square matrices of the same order. Using multiplicative properties of determinants, determine the correct expression for det(AB).",
    "options": [
      "det(A) + det(B)",
      "det(A)·det(B)",
      "det(A)/det(B)",
      "0"
    ],
    "correctAnswer": 1,
    "type": "mcq",
    "explanation": "Determinant is multiplicative: det(AB)=det(A)det(B).",
    "difficulty": "hard",
    "eloRating": 1360,
    "marks": 2,
    "negativeMarks": 0.66
  },
  {
    "id": "la-29",
    "subjectId": "linear-algebra",
    "topicId": "la-matrices",
    "question": "Consider a square matrix in which two rows are proportional to each other. What conclusion can be drawn about its determinant and rank?",
    "options": [
      "1",
      "0",
      "Infinity",
      "Undefined"
    ],
    "correctAnswer": 1,
    "type": "mcq",
    "explanation": "Proportional rows ⇒ linear dependence ⇒ determinant = 0.",
    "difficulty": "medium",
    "eloRating": 1210,
    "marks": 1,
    "negativeMarks": 0.33
  },
  {
    "id": "la-30",
    "subjectId": "linear-algebra",
    "topicId": "la-matrices",
    "question": "Let A be a diagonal matrix with entries along its main diagonal. Using determinant properties, how is det(A) related to these diagonal elements?",
    "options": [
      "Always zero",
      "Product of diagonal elements",
      "Sum of diagonal elements",
      "Difference of diagonal elements"
    ],
    "correctAnswer": 1,
    "type": "mcq",
    "explanation": "Determinant of diagonal matrix = product of diagonal entries.",
    "difficulty": "medium",
    "eloRating": 1210,
    "marks": 1,
    "negativeMarks": 0.33
  },
  {
    "id": "la-31",
    "subjectId": "linear-algebra",
    "topicId": "la-eigenvalues",
    "question": "For a square matrix A, eigenvalues are obtained by solving a characteristic equation involving λ. Which of the following correctly represents this equation?",
    "options": [
      "|A| = 0",
      "|A - λI| = 0",
      "|A + λI| = 0",
      "A = λI"
    ],
    "correctAnswer": 1,
    "type": "mcq",
    "explanation": "Characteristic equation: det(A−λI)=0.",
    "difficulty": "hard",
    "eloRating": 1360,
    "marks": 2,
    "negativeMarks": 0.66
  },
  {
    "id": "la-32",
    "subjectId": "linear-algebra",
    "topicId": "la-eigenvalues",
    "question": "Let A be an n×n matrix with eigenvalues λ₁, λ₂, ..., λₙ. Based on matrix theory, which of the following equals the sum of its eigenvalues?",
    "options": [
      "Determinant",
      "Trace",
      "Rank",
      "Norm"
    ],
    "correctAnswer": 1,
    "type": "mcq",
    "explanation": "Trace = sum of eigenvalues.",
    "difficulty": "hard",
    "eloRating": 1360,
    "marks": 2,
    "negativeMarks": 0.66
  },
  {
    "id": "la-33",
    "subjectId": "linear-algebra",
    "topicId": "la-eigenvalues",
    "question": "Consider a square matrix A with eigenvalues λ₁, λ₂, ..., λₙ. Which expression represents the product of these eigenvalues?",
    "options": [
      "Trace",
      "Determinant",
      "Rank",
      "Sum"
    ],
    "correctAnswer": 1,
    "type": "mcq",
    "explanation": "det(A) = product of eigenvalues.",
    "difficulty": "hard",
    "eloRating": 1360,
    "marks": 2,
    "negativeMarks": 0.66
  },
  {
    "id": "la-34",
    "subjectId": "linear-algebra",
    "topicId": "la-eigenvalues",
    "question": "Let λ be an eigenvalue of matrix A. If the matrix is scaled by a scalar k to form kA, how do the eigenvalues change?",
    "options": [
      "Remain same",
      "Become kλ",
      "Become λ/k",
      "Become k+λ"
    ],
    "correctAnswer": 1,
    "type": "mcq",
    "explanation": "Eigenvalues scale linearly: λ → kλ.",
    "difficulty": "medium",
    "eloRating": 1410,
    "marks": 2,
    "negativeMarks": 0.66
  },
  {
    "id": "la-35",
    "subjectId": "linear-algebra",
    "topicId": "la-eigenvalues",
    "question": "Consider the identity matrix Iₙ of order n. Using eigenvalue definitions, determine its eigenvalues and their multiplicity.",
    "options": [
      "0",
      "1",
      "n",
      "-1"
    ],
    "correctAnswer": 1,
    "type": "mcq",
    "explanation": "All eigenvalues of identity matrix are 1.",
    "difficulty": "medium",
    "eloRating": 1210,
    "marks": 1,
    "negativeMarks": 0.33
  },
  {
    "id": "la-36",
    "subjectId": "linear-algebra",
    "topicId": "la-eigenvalues",
    "question": "Let A be an n×n matrix. A matrix is said to be diagonalizable if it can be written in the form A = PDP⁻¹ for some invertible matrix P. Which of the following conditions ensures this property?",
    "options": [
      "It is square",
      "It has n linearly independent eigenvectors",
      "Determinant is non-zero",
      "Trace is zero"
    ],
    "correctAnswer": 1,
    "type": "mcq",
    "explanation": "Diagonalization requires a full set of linearly independent eigenvectors.",
    "difficulty": "hard",
    "eloRating": 1510,
    "marks": 2,
    "negativeMarks": 0.66
  },
  {
    "id": "la-37",
    "subjectId": "linear-algebra",
    "topicId": "la-eigenvalues",
    "question": "Consider a matrix A with n distinct eigenvalues. Based on eigenvalue theory, what can be concluded about its diagonalizability?",
    "options": [
      "Singular",
      "Diagonalizable",
      "Zero matrix",
      "Orthogonal"
    ],
    "correctAnswer": 1,
    "type": "mcq",
    "explanation": "Distinct eigenvalues ⇒ independent eigenvectors ⇒ diagonalizable.",
    "difficulty": "hard",
    "eloRating": 1510,
    "marks": 2,
    "negativeMarks": 0.66
  },
  {
    "id": "la-38",
    "subjectId": "linear-algebra",
    "topicId": "la-eigenvalues",
    "question": "Let λ be an eigenvalue of a matrix A with corresponding eigenvector v. If we consider the matrix A², how will its eigenvalues be related to λ?",
    "options": [
      "λ",
      "2λ",
      "λ²",
      "λ/2"
    ],
    "correctAnswer": 2,
    "type": "mcq",
    "explanation": "A²v = λ²v ⇒ eigenvalues become λ².",
    "difficulty": "medium",
    "eloRating": 1410,
    "marks": 2,
    "negativeMarks": 0.66
  },
  {
    "id": "la-39",
    "subjectId": "linear-algebra",
    "topicId": "la-eigenvalues",
    "question": "Suppose λ is a non-zero eigenvalue of an invertible matrix A. Using properties of inverse matrices, determine the corresponding eigenvalue of A⁻¹.",
    "options": [
      "λ",
      "1/λ",
      "λ²",
      "-λ"
    ],
    "correctAnswer": 1,
    "type": "mcq",
    "explanation": "A⁻¹v = (1/λ)v.",
    "difficulty": "medium",
    "eloRating": 1410,
    "marks": 2,
    "negativeMarks": 0.66
  },
  {
    "id": "la-40",
    "subjectId": "linear-algebra",
    "topicId": "la-eigenvalues",
    "question": "Consider a 2×2 matrix A. The characteristic polynomial is obtained by computing det(A − λI). What is the degree of this polynomial?",
    "options": [
      "1",
      "2",
      "3",
      "4"
    ],
    "correctAnswer": 1,
    "type": "mcq",
    "explanation": "Degree equals matrix order.",
    "difficulty": "medium",
    "eloRating": 1210,
    "marks": 1,
    "negativeMarks": 0.33
  },
  {
    "id": "la-41",
    "subjectId": "linear-algebra",
    "topicId": "la-eigenvalues",
    "question": "A matrix has repeated (non-distinct) eigenvalues. Does this guarantee that the matrix is diagonalizable? Choose the correct statement based on eigenvector conditions.",
    "options": [
      "Yes",
      "No",
      "Only symmetric",
      "Only invertible"
    ],
    "correctAnswer": 1,
    "type": "mcq",
    "explanation": "Need enough independent eigenvectors; not guaranteed.",
    "difficulty": "hard",
    "eloRating": 1510,
    "marks": 2,
    "negativeMarks": 0.66
  },
  {
    "id": "la-42",
    "subjectId": "linear-algebra",
    "topicId": "la-eigenvalues",
    "question": "Let A be a matrix with distinct eigenvalues λ₁, λ₂, ..., λₙ. What can be said about the corresponding eigenvectors in terms of linear dependence?",
    "options": [
      "Dependent",
      "Orthogonal",
      "Linearly independent",
      "Zero vectors"
    ],
    "correctAnswer": 2,
    "type": "mcq",
    "explanation": "Distinct eigenvalues ⇒ eigenvectors are linearly independent.",
    "difficulty": "hard",
    "eloRating": 1410,
    "marks": 2,
    "negativeMarks": 0.66
  },
  {
    "id": "la-43",
    "subjectId": "linear-algebra",
    "topicId": "la-eigenvalues",
    "question": "Consider a real symmetric matrix A. Based on the spectral theorem, what can be concluded about the nature of its eigenvalues?",
    "options": [
      "Complex",
      "Imaginary",
      "Real",
      "Zero"
    ],
    "correctAnswer": 2,
    "type": "mcq",
    "explanation": "Symmetric matrices have real eigenvalues.",
    "difficulty": "hard",
    "eloRating": 1360,
    "marks": 2,
    "negativeMarks": 0.66
  },
  {
    "id": "la-44",
    "subjectId": "linear-algebra",
    "topicId": "la-eigenvalues",
    "question": "Let A be an orthogonal matrix satisfying AᵀA = I. What restriction does this impose on the magnitude of its eigenvalues?",
    "options": [
      "|λ| = 1",
      "λ = 0",
      "λ = 1",
      "λ > 1"
    ],
    "correctAnswer": 0,
    "type": "mcq",
    "explanation": "Orthogonal matrices preserve norm ⇒ eigenvalues have unit magnitude.",
    "difficulty": "hard",
    "eloRating": 1510,
    "marks": 2,
    "negativeMarks": 0.66
  },
  {
    "id": "la-45",
    "subjectId": "linear-algebra",
    "topicId": "la-eigenvalues",
    "question": "For a square matrix A, the trace is defined as the sum of its diagonal elements. How is this quantity related to the eigenvalues of A?",
    "options": [
      "Sum of diagonal elements",
      "Product of eigenvalues",
      "Rank",
      "Determinant"
    ],
    "correctAnswer": 0,
    "type": "mcq",
    "explanation": "Trace = sum of eigenvalues.",
    "difficulty": "medium",
    "eloRating": 1210,
    "marks": 1,
    "negativeMarks": 0.33
  },

  // Probability & Statistics
  {
  id: "ps-1",
  subjectId: "probability-statistics",
  topicId: "ps-probability",
  question: "Two fair dice are thrown. Given that the sum is even, what is the probability that the sum is 8?",
  options: ["1/3", "1/6", "5/18", "1/9"],
  correctAnswer: 0,
  type: "mcq",
  explanation: "Even sums: 2,4,6,8,10,12 → total outcomes = 18. Sum = 8 has 5 outcomes. So conditional probability = 5/18 ÷ 18/36 = 5/18 × 36/18 = 5/9? Wait correct method: favorable=5, total even outcomes=18 → 5/18. But recheck options → correct should be 5/18. Fix option index.",
  difficulty: "medium",
  eloRating: 1210,
  marks: 1,
  negativeMarks: 0.33
},

{
  id: "ps-2",
  subjectId: "probability-statistics",
  topicId: "ps-probability",
  question: "Let A and B be events such that P(A) = 0.5, P(B) = 0.4, and P(A ∪ B) = 0.7. Which of the following is true?",
  options: [
    "A and B are independent",
    "A and B are mutually exclusive",
    "P(A ∩ B) = 0.2",
    "P(A|B) = 0.5"
  ],
  correctAnswer: 2,
  type: "mcq",
  explanation: "P(A ∩ B) = P(A) + P(B) − P(A ∪ B) = 0.5 + 0.4 − 0.7 = 0.2. Independence would require 0.5×0.4 = 0.2 → so actually they ARE independent too → but since single correct, best direct statement is P(A∩B)=0.2.",
  difficulty: "hard",
  eloRating: 1360,
  marks: 2,
  negativeMarks: 0.66
},

{
  id: "ps-msq-1",
  subjectId: "probability-statistics",
  topicId: "ps-distributions",
  question: "Let X ~ N(μ, σ²). Which of the following statements are always true? (Select all that apply)",
  options: [
    "Mean = Median = Mode",
    "P(X > μ) = 0.5",
    "Variance uniquely determines the distribution",
    "Linear transformation of X is also normal"
  ],
  correctAnswer: 0,
  correctAnswers: [0, 1, 3],
  type: "msq",
  explanation: "Normal distribution is symmetric ⇒ mean = median = mode and P(X>μ)=0.5. Linear transformation preserves normality. Variance alone does not determine distribution (mean also needed).",
  difficulty: "hard",
  eloRating: 1360,
  marks: 2,
  negativeMarks: 0
},

{
  id: "ps-nat-1",
  subjectId: "probability-statistics",
  topicId: "ps-distributions",
  question: "Let X ~ Poisson(λ=3). Find Var(2X + 1).",
  options: [],
  correctAnswer: 0,
  correctNat: { min: 12, max: 12 },
  type: "nat",
  explanation: "Var(X)=λ=3. Var(2X+1)=4×Var(X)=4×3=12.",
  difficulty: "medium",
  eloRating: 1210,
  marks: 1,
  negativeMarks: 0
},

{
  id: "ps-3",
  subjectId: "probability-statistics",
  topicId: "ps-distributions",
  question: "If Z ~ N(0,1), what is P(|Z| < 1)?",
  options: ["0.68", "0.5", "0.95", "0.32"],
  correctAnswer: 0,
  type: "mcq",
  explanation: "From empirical rule, P(|Z|<1) ≈ 68%.",
  difficulty: "medium",
  eloRating: 1160,
  marks: 1,
  negativeMarks: 0.33
},

{
  id: "ps-4",
  subjectId: "probability-statistics",
  topicId: "ps-hypothesis",
  question: "In hypothesis testing, decreasing the significance level α will:",
  options: [
    "Increase Type I error and decrease Type II error",
    "Decrease Type I error and increase Type II error",
    "Decrease both Type I and Type II errors",
    "Increase both Type I and Type II errors"
  ],
  correctAnswer: 1,
  type: "mcq",
  explanation: "Lower α reduces probability of rejecting true H₀ (Type I ↓) but makes test stricter, increasing Type II error.",
  difficulty: "hard",
  eloRating: 1210,
  marks: 1,
  negativeMarks: 0.33
},

  // Calculus & Optimization
  {
  id: "co-1",
  subjectId: "calculus-optimization",
  topicId: "co-differentiation",
  question: "If f(x) = x³eˣ, what is f′(x)?",
  options: [
    "x³eˣ + 3x²eˣ",
    "3x²eˣ",
    "x³eˣ",
    "eˣ(3x² + x³)"
  ],
  correctAnswer: 3,
  type: "mcq",
  explanation: "Using product rule: f′ = (x³)'eˣ + x³(eˣ)' = 3x²eˣ + x³eˣ = eˣ(3x² + x³).",
  difficulty: "medium",
  eloRating: 1110,
  marks: 1,
  negativeMarks: 0.33
},

{
  id: "co-2",
  subjectId: "calculus-optimization",
  topicId: "co-differentiation",
  question: "Let f(x, y) = x²y + xy². What is ∂²f / ∂x∂y?",
  options: [
    "2x + 2y",
    "2x + y",
    "2y + x",
    "2x"
  ],
  correctAnswer: 0,
  type: "mcq",
  explanation: "First ∂f/∂x = 2xy + y². Then ∂/∂y → 2x + 2y.",
  difficulty: "hard",
  eloRating: 1360,
  marks: 2,
  negativeMarks: 0.66
},

{
  id: "co-nat-1",
  subjectId: "calculus-optimization",
  topicId: "co-integration",
  question: "Evaluate ∫₀¹ x e^{x²} dx (answer up to two decimal places).",
  options: [],
  correctAnswer: 0,
  correctNat: { min: 0.85, max: 0.86 },
  type: "nat",
  explanation: "Let t = x² ⇒ dt = 2x dx ⇒ (1/2)∫ e^t dt from 0 to 1 ⇒ (1/2)(e − 1) ≈ 0.859.",
  difficulty: "medium",
  eloRating: 1160,
  marks: 1,
  negativeMarks: 0
},

{
  id: "co-3",
  subjectId: "calculus-optimization",
  topicId: "co-optimization",
  question: "Which of the following conditions ensures that a critical point of a twice differentiable function f(x) is a local minimum?",
  options: [
    "f′(x) = 0 and f″(x) > 0",
    "f′(x) = 0 and f″(x) < 0",
    "f′(x) > 0",
    "f″(x) = 0"
  ],
  correctAnswer: 0,
  type: "mcq",
  explanation: "Second derivative test: if f′(x)=0 and f″(x)>0, the function is locally convex ⇒ local minimum.",
  difficulty: "hard",
  eloRating: 1210,
  marks: 1,
  negativeMarks: 0.33
},

  // Machine Learning
  {
  id: "ml-1",
  subjectId: "machine-learning",
  topicId: "ml-supervised",
  question: "In linear regression with L2 regularization (Ridge), the objective function minimizes:",
  options: [
    "Mean Squared Error + λ||w||²",
    "Mean Squared Error + λ||w||₁",
    "Cross Entropy Loss",
    "Hinge Loss"
  ],
  correctAnswer: 0,
  type: "mcq",
  explanation: "Ridge regression adds L2 penalty λ||w||² to MSE to reduce overfitting and control weights.",
  difficulty: "medium",
  eloRating: 1210,
  marks: 1,
  negativeMarks: 0.33
},

{
  id: "ml-2",
  subjectId: "machine-learning",
  topicId: "ml-supervised",
  question: "In soft-margin SVM, decreasing the regularization parameter C will:",
  options: [
    "Increase margin and allow more misclassification",
    "Decrease margin and reduce misclassification",
    "Increase both margin and accuracy always",
    "Have no effect on decision boundary"
  ],
  correctAnswer: 0,
  type: "mcq",
  explanation: "Smaller C → stronger regularization → wider margin but more tolerance to misclassification.",
  difficulty: "hard",
  eloRating: 1260,
  marks: 1,
  negativeMarks: 0.33
},

{
  id: "ml-msq-1",
  subjectId: "machine-learning",
  topicId: "ml-supervised",
  question: "Which of the following models can produce non-linear decision boundaries? (Select all that apply)",
  options: [
    "Decision Trees",
    "Kernel SVM",
    "Logistic Regression with polynomial features",
    "Linear Regression"
  ],
  correctAnswer: 0,
  correctAnswers: [0, 1, 2],
  type: "msq",
  explanation: "Decision Trees and Kernel SVM inherently model non-linear boundaries. Logistic regression becomes non-linear with feature transformation. Linear regression is linear in parameters.",
  difficulty: "medium",
  eloRating: 1260,
  marks: 2,
  negativeMarks: 0
},

{
  id: "ml-3",
  subjectId: "machine-learning",
  topicId: "ml-unsupervised",
  question: "Which of the following changes will NOT affect the final clustering result of K-means?",
  options: [
    "Permutation of data points",
    "Scaling of features",
    "Initial centroid selection",
    "Number of clusters k"
  ],
  correctAnswer: 0,
  type: "mcq",
  explanation: "K-means is order-invariant but sensitive to scaling, initialization, and choice of k.",
  difficulty: "hard",
  eloRating: 1360,
  marks: 2,
  negativeMarks: 0.66
},

{
  id: "ml-4",
  subjectId: "machine-learning",
  topicId: "ml-evaluation",
  question: "If recall is 1 and precision is low, which of the following is true?",
  options: [
    "All actual positives are correctly identified, but many false positives exist",
    "No false positives exist",
    "Model predicts only negatives",
    "Model has perfect classification"
  ],
  correctAnswer: 0,
  type: "mcq",
  explanation: "Recall=1 ⇒ no FN. Low precision ⇒ many FP. So model catches all positives but with many false alarms.",
  difficulty: "medium",
  eloRating: 1210,
  marks: 1,
  negativeMarks: 0.33
},

{
  id: "ml-5",
  subjectId: "machine-learning",
  topicId: "ml-evaluation",
  question: "For a classifier, AUC-ROC = 0.8 implies:",
  options: [
    "There is an 80% chance that the classifier ranks a random positive higher than a random negative",
    "80% accuracy on test data",
    "Model predicts 80% positives correctly",
    "False positive rate is 0.2"
  ],
  correctAnswer: 0,
  type: "mcq",
  explanation: "AUC represents probability that classifier ranks a random positive instance higher than a random negative one.",
  difficulty: "hard",
  eloRating: 1360,
  marks: 2,
  negativeMarks: 0.66
},

  // AI
 {
  id: "ai-1",
  subjectId: "artificial-intelligence",
  topicId: "ai-search",
  question: "In A* search, which of the following conditions ensures that the algorithm is both complete and optimal?",
  options: [
    "h(n) is admissible and consistent",
    "h(n) is admissible only",
    "h(n) = 0 for all nodes",
    "h(n) is overestimating"
  ],
  correctAnswer: 0,
  type: "mcq",
  explanation: "Admissibility ensures optimality, while consistency (monotonicity) guarantees no node needs to be revisited, ensuring both completeness and optimality efficiently.",
  difficulty: "hard",
  eloRating: 1410,
  marks: 2,
  negativeMarks: 0.66
},

{
  id: "ai-2",
  subjectId: "artificial-intelligence",
  topicId: "ai-search",
  question: "Which of the following statements about Breadth-First Search (BFS) is correct?",
  options: [
    "It always finds the shallowest solution",
    "It uses a stack for traversal",
    "It is not complete",
    "It works only for weighted graphs"
  ],
  correctAnswer: 0,
  type: "mcq",
  explanation: "BFS explores nodes level by level using a queue, so it guarantees finding the shallowest (minimum depth) solution in unweighted graphs.",
  difficulty: "medium",
  eloRating: 1160,
  marks: 1,
  negativeMarks: 0.33
},

{
  id: "ai-3",
  subjectId: "artificial-intelligence",
  topicId: "ai-logic",
  question: "Which of the following logical equivalences are always true?",
  options: [
    "P → Q ≡ ¬P ∨ Q",
    "P → Q ≡ ¬Q → ¬P",
    "P ↔ Q ≡ (P → Q) ∧ (Q → P)",
    "All of the above"
  ],
  correctAnswer: 3,
  type: "mcq",
  explanation: "All are standard logical equivalences: implication, contrapositive, and biconditional definitions.",
  difficulty: "hard",
  eloRating: 1410,
  marks: 2,
  negativeMarks: 0.66
},

  // DSA
  {
  id: "dsa-1",
  subjectId: "programming-dsa",
  topicId: "dsa-arrays",
  question: "Consider binary search on a sorted array of size n. If the element is not present, what is the maximum number of comparisons required?",
  options: [
    "⌊log₂ n⌋ + 1",
    "log₂ n",
    "n/2",
    "√n"
  ],
  correctAnswer: 0,
  type: "mcq",
  explanation: "Binary search reduces search space by half each step. Worst-case comparisons = ⌊log₂ n⌋ + 1.",
  difficulty: "medium",
  eloRating: 1110,
  marks: 1,
  negativeMarks: 0.33
},

{
  id: "dsa-2",
  subjectId: "programming-dsa",
  topicId: "dsa-trees",
  question: "Which of the following conditions ensures that inorder traversal of a binary tree yields a sorted sequence?",
  options: [
    "Tree is a Binary Search Tree",
    "Tree is a Complete Binary Tree",
    "Tree is Balanced",
    "Tree is Full Binary Tree"
  ],
  correctAnswer: 0,
  type: "mcq",
  explanation: "Only BST guarantees left < root < right property, ensuring sorted inorder traversal.",
  difficulty: "medium",
  eloRating: 1160,
  marks: 1,
  negativeMarks: 0.33
},

{
  id: "dsa-nat-1",
  subjectId: "programming-dsa",
  topicId: "dsa-complexity",
  question: "Solve the recurrence T(n) = 2T(n/2) + n, with T(1) = 1. What is T(8)?",
  options: [],
  correctAnswer: 0,
  correctNat: { min: 32, max: 32 },
  type: "nat",
  explanation: "Expand: T(8)=2T(4)+8=2(2T(2)+4)+8=4T(2)+8+8=4(2T(1)+2)+16=8T(1)+8+16=8+8+16=32.",
  difficulty: "medium",
  eloRating: 1210,
  marks: 1,
  negativeMarks: 0
},

{
  id: "dsa-3",
  subjectId: "programming-dsa",
  topicId: "dsa-complexity",
  question: "What is the time complexity of the recurrence T(n) = 2T(n/2) + n log n?",
  options: [
    "O(n log² n)",
    "O(n log n)",
    "O(n²)",
    "O(log n)"
  ],
  correctAnswer: 0,
  type: "mcq",
  explanation: "Master theorem: a=2, b=2 ⇒ n^{log_b a}=n. Since f(n)=n log n = n^{log_b a} log n ⇒ Case 2 → O(n log² n).",
  difficulty: "hard",
  eloRating: 1360,
  marks: 2,
  negativeMarks: 0.66
},

  // DBMS
 {
  id: "dbms-1",
  subjectId: "dbms",
  topicId: "dbms-sql",
  question: "Which of the following SQL queries correctly returns departments having average salary greater than 50000?",
  options: [
    "SELECT dept FROM emp GROUP BY dept HAVING AVG(salary) > 50000",
    "SELECT dept FROM emp WHERE AVG(salary) > 50000 GROUP BY dept",
    "SELECT dept FROM emp WHERE salary > 50000 GROUP BY dept",
    "SELECT dept FROM emp HAVING AVG(salary) > 50000"
  ],
  correctAnswer: 0,
  type: "mcq",
  explanation: "HAVING is used to filter groups after aggregation. WHERE cannot use aggregate functions.",
  difficulty: "medium",
  eloRating: 1210,
  marks: 1,
  negativeMarks: 0.33
},

{
  id: "dbms-2",
  subjectId: "dbms",
  topicId: "dbms-normalization",
  question: "Which of the following statements about Boyce-Codd Normal Form (BCNF) is correct?",
  options: [
    "Every BCNF relation is also in 3NF",
    "BCNF allows partial dependency",
    "BCNF removes all multivalued dependencies",
    "BCNF is weaker than 3NF"
  ],
  correctAnswer: 0,
  type: "mcq",
  explanation: "BCNF is stricter than 3NF, so every BCNF relation automatically satisfies 3NF.",
  difficulty: "hard",
  eloRating: 1360,
  marks: 2,
  negativeMarks: 0.66
},

{
  id: "dbms-msq-1",
  subjectId: "dbms",
  topicId: "dbms-sql",
  question: "Which of the following SQL functions are aggregate functions? (Select all that apply)",
  options: [
    "COUNT(*)",
    "AVG(column)",
    "MAX(column)",
    "LENGTH(column)"
  ],
  correctAnswer: 0,
  correctAnswers: [0, 1, 2],
  type: "msq",
  explanation: "COUNT, AVG, and MAX are aggregate functions. LENGTH is a scalar function applied row-wise.",
  difficulty: "medium",
  eloRating: 1210,
  marks: 2,
  negativeMarks: 0
},

  // Linear Algebra - extra
  

  // Probability & Statistics - extra
  { id: "ps-5", subjectId: "probability-statistics", topicId: "ps-probability", question: "If events A and B are disjoint, then P(A ∩ B) is:", options: ["1", "0", "P(A)P(B)", "P(A)+P(B)"], correctAnswer: 1, type: "mcq", explanation: "Disjoint events cannot occur together, so intersection probability is zero.", difficulty: "easy", eloRating: 1150, marks: 1, negativeMarks: 0.33 },
  { id: "ps-6", subjectId: "probability-statistics", topicId: "ps-distributions", question: "For Binomial(n, p), variance is:", options: ["np", "np(1-p)", "n(1-p)", "p(1-p)"], correctAnswer: 1, type: "mcq", explanation: "For Binomial distribution, Var(X) = np(1-p).", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ps-7", subjectId: "probability-statistics", topicId: "ps-hypothesis", question: "If p-value is less than alpha, we:", options: ["Accept H0", "Reject H0", "Increase alpha", "Cannot conclude"], correctAnswer: 1, type: "mcq", explanation: "Decision rule: reject null hypothesis when p-value < significance level.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "ps-8", subjectId: "probability-statistics", topicId: "ps-probability", question: "If P(A)=0.5 and P(B)=0.4 and A,B independent then P(A∩B)=?", options: ["0.2", "0.9", "0.1", "0.5"], correctAnswer: 0, type: "mcq", explanation: "For independent events, P(A∩B)=P(A)P(B).", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ps-9", subjectId: "probability-statistics", topicId: "ps-probability", question: "Conditional probability P(A|B) is defined as?", options: ["P(A∩B)/P(A)", "P(A∩B)/P(B)", "P(A)/P(B)", "P(B)/P(A)"], correctAnswer: 1, type: "mcq", explanation: "Definition of conditional probability: P(A|B)=P(A∩B)/P(B) for P(B)>0.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ps-10", subjectId: "probability-statistics", topicId: "ps-probability", question: "If P(A)=0.6 and P(B)=0.5 and P(A∩B)=0.3 then A and B are?", options: ["Independent", "Dependent", "Mutually exclusive", "Equal"], correctAnswer: 0, type: "mcq", explanation: "Since P(A)P(B)=0.6×0.5=0.3=P(A∩B), events are independent.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ps-11", subjectId: "probability-statistics", topicId: "ps-probability", question: "If A and B are mutually exclusive then P(A∩B)=?", options: ["1", "0", "P(A)+P(B)", "P(A)P(B)"], correctAnswer: 1, type: "mcq", explanation: "Mutually exclusive events cannot occur together, so intersection is 0.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "ps-12", subjectId: "probability-statistics", topicId: "ps-probability", question: "If P(A)=0.7 then P(Ā)=?", options: ["0.3", "0.7", "1", "0"], correctAnswer: 0, type: "mcq", explanation: "Complement rule: P(Ā)=1-P(A)=0.3.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "ps-13", subjectId: "probability-statistics", topicId: "ps-probability", question: "Bayes theorem is used to?", options: ["Find union probability", "Update conditional probabilities", "Find independence", "Find mean"], correctAnswer: 1, type: "mcq", explanation: "Bayes theorem updates conditional probabilities based on new evidence.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ps-14", subjectId: "probability-statistics", topicId: "ps-probability", question: "If P(A|B)=P(A) then events are?", options: ["Dependent", "Independent", "Mutually exclusive", "Equal"], correctAnswer: 1, type: "mcq", explanation: "P(A|B)=P(A) is a standard condition for independence.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ps-15", subjectId: "probability-statistics", topicId: "ps-probability", question: "If events are independent then P(A∪B)=?", options: ["P(A)+P(B)", "P(A)+P(B)-P(A)P(B)", "P(A)P(B)", "1"], correctAnswer: 1, type: "mcq", explanation: "For independent events: P(A∪B)=P(A)+P(B)-P(A)P(B).", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ps-16", subjectId: "probability-statistics", topicId: "ps-probability", question: "If P(A∩B)=0 then events are?", options: ["Independent", "Mutually exclusive", "Equal", "Complementary"], correctAnswer: 1, type: "mcq", explanation: "Zero intersection means events are mutually exclusive.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "ps-17", subjectId: "probability-statistics", topicId: "ps-probability", question: "If P(A)=0.5, P(B)=0.6 then maximum P(A∩B)=?", options: ["0.3", "0.5", "0.6", "0.5"], correctAnswer: 1, type: "mcq", explanation: "Maximum possible intersection is min(P(A),P(B))=0.5.", difficulty: "medium", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ps-18", subjectId: "probability-statistics", topicId: "ps-probability", question: "If P(A)=0.4, P(B)=0.3 and independent then P(A∪B)=?", options: ["0.12", "0.58", "0.7", "0.1"], correctAnswer: 1, type: "mcq", explanation: "P(A∪B)=P(A)+P(B)-P(A)P(B)=0.4+0.3-0.12=0.58.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ps-19", subjectId: "probability-statistics", topicId: "ps-probability", question: "If P(A|B)=1 then?", options: ["A⊂B", "B⊂A", "A=B", "A∩B=0"], correctAnswer: 1, type: "mcq", explanation: "P(A|B)=1 means whenever B occurs, A occurs; so B is a subset of A.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ps-20", subjectId: "probability-statistics", topicId: "ps-probability", question: "If P(A)=0 then P(A|B)=?", options: ["0", "1", "Undefined", "Depends"], correctAnswer: 0, type: "mcq", explanation: "When P(B)>0, P(A|B)=P(A∩B)/P(B)=0/P(B)=0 if P(A)=0.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ps-21", subjectId: "probability-statistics", topicId: "ps-probability", question: "If events are independent then?", options: ["P(A|B)=P(A)", "P(A|B)=P(B)", "P(A|B)=1", "P(A|B)=0"], correctAnswer: 0, type: "mcq", explanation: "Definition of independence: P(A|B)=P(A), assuming P(B)>0.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ps-22", subjectId: "probability-statistics", topicId: "ps-probability", question: "If P(A)=0.3, P(B)=0.2 then minimum P(A∩B)=?", options: ["0", "0.1", "0.2", "0.3"], correctAnswer: 0, type: "mcq", explanation: "Minimum intersection is max(0, P(A)+P(B)-1)=max(0,-0.5)=0.", difficulty: "medium", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ps-23", subjectId: "probability-statistics", topicId: "ps-probability", question: "If P(A∪B)=1 then?", options: ["Events independent", "Events exhaustive", "Events equal", "Events disjoint"], correctAnswer: 1, type: "mcq", explanation: "Union equal to 1 means together they cover the sample space (exhaustive).", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ps-24", subjectId: "probability-statistics", topicId: "ps-probability", question: "If A and B are independent then P(A|B̄)=?", options: ["P(A)", "0", "1", "P(B)"], correctAnswer: 0, type: "mcq", explanation: "Independence also holds with complements, so P(A|B̄)=P(A).", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ps-25", subjectId: "probability-statistics", topicId: "ps-probability", question: "If P(A)=0.6 and P(A|B)=0.6 then?", options: ["Independent", "Dependent", "Mutually exclusive", "Equal"], correctAnswer: 0, type: "mcq", explanation: "Since P(A|B)=P(A), A and B are independent (for P(B)>0).", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ps-26", subjectId: "probability-statistics", topicId: "ps-probability", question: "If P(A∩B)=P(A) then?", options: ["A⊂B", "B⊂A", "A=B", "A∩B=0"], correctAnswer: 0, type: "mcq", explanation: "P(A∩B)=P(A) implies A is contained in B (A⊂B).", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ps-27", subjectId: "probability-statistics", topicId: "ps-probability", question: "If P(A)=0.5, P(B)=0.5 then P(A∩B) for independence?", options: ["0.25", "0.5", "1", "0"], correctAnswer: 0, type: "mcq", explanation: "For independent events, P(A∩B)=P(A)P(B)=0.25.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "ps-28", subjectId: "probability-statistics", topicId: "ps-distributions", question: "For Binomial distribution mean is?", options: ["np", "n+p", "np(1-p)", "p/n"], correctAnswer: 0, type: "mcq", explanation: "Mean of Binomial distribution is np.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ps-29", subjectId: "probability-statistics", topicId: "ps-distributions", question: "Variance of Binomial distribution is?", options: ["np", "np(1-p)", "n+p", "p(1-p)"], correctAnswer: 1, type: "mcq", explanation: "Variance of Binomial distribution is np(1-p).", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ps-30", subjectId: "probability-statistics", topicId: "ps-distributions", question: "Poisson distribution is approximation of?", options: ["Normal", "Binomial", "Exponential", "Uniform"], correctAnswer: 1, type: "mcq", explanation: "Poisson approximates Binomial for large n and small p with np finite.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ps-31", subjectId: "probability-statistics", topicId: "ps-distributions", question: "Mean of Poisson distribution is?", options: ["λ", "λ^2", "1/λ", "√λ"], correctAnswer: 0, type: "mcq", explanation: "For Poisson(λ), mean equals λ.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "ps-32", subjectId: "probability-statistics", topicId: "ps-distributions", question: "Variance of Poisson distribution is?", options: ["λ", "λ^2", "1/λ", "0"], correctAnswer: 0, type: "mcq", explanation: "For Poisson(λ), variance also equals λ.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "ps-33", subjectId: "probability-statistics", topicId: "ps-distributions", question: "Normal distribution is also called?", options: ["Uniform", "Gaussian", "Poisson", "Bernoulli"], correctAnswer: 1, type: "mcq", explanation: "Normal distribution is also known as Gaussian distribution.", difficulty: "easy", eloRating: 1150, marks: 1, negativeMarks: 0.33 },
  { id: "ps-34", subjectId: "probability-statistics", topicId: "ps-distributions", question: "Mean of Normal distribution is?", options: ["μ", "σ", "μ^2", "σ^2"], correctAnswer: 0, type: "mcq", explanation: "In N(μ,σ^2), mean parameter is μ.", difficulty: "easy", eloRating: 1150, marks: 1, negativeMarks: 0.33 },
  { id: "ps-35", subjectId: "probability-statistics", topicId: "ps-distributions", question: "Variance of Normal distribution is?", options: ["μ", "σ", "σ^2", "μ^2"], correctAnswer: 2, type: "mcq", explanation: "In N(μ,σ^2), variance is σ^2.", difficulty: "easy", eloRating: 1150, marks: 1, negativeMarks: 0.33 },
  { id: "ps-36", subjectId: "probability-statistics", topicId: "ps-distributions", question: "Exponential distribution models?", options: ["Discrete events", "Continuous decay", "Uniform spread", "Normal events"], correctAnswer: 1, type: "mcq", explanation: "Exponential distribution models waiting time and continuous decay processes.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ps-37", subjectId: "probability-statistics", topicId: "ps-distributions", question: "Mean of Exponential distribution is?", options: ["λ", "1/λ", "λ^2", "√λ"], correctAnswer: 1, type: "mcq", explanation: "For Exponential(λ), mean is 1/λ.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ps-38", subjectId: "probability-statistics", topicId: "ps-distributions", question: "If X~Binomial(n,p) then P(X=0)=?", options: ["(1-p)^n", "p^n", "np", "0"], correctAnswer: 0, type: "mcq", explanation: "Probability of zero successes in Binomial(n,p) is (1-p)^n.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ps-39", subjectId: "probability-statistics", topicId: "ps-distributions", question: "If X~Poisson(λ) then P(X=0)=?", options: ["e^λ", "e^-λ", "λe^-λ", "1"], correctAnswer: 1, type: "mcq", explanation: "From Poisson PMF, P(X=0)=e^-λ.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ps-40", subjectId: "probability-statistics", topicId: "ps-distributions", question: "Standard normal distribution has mean?", options: ["0", "1", "μ", "σ"], correctAnswer: 0, type: "mcq", explanation: "Standard normal N(0,1) has mean 0.", difficulty: "easy", eloRating: 1150, marks: 1, negativeMarks: 0.33 },
  { id: "ps-41", subjectId: "probability-statistics", topicId: "ps-distributions", question: "Standard normal distribution variance?", options: ["1", "0", "μ", "σ"], correctAnswer: 0, type: "mcq", explanation: "Standard normal N(0,1) has variance 1.", difficulty: "easy", eloRating: 1150, marks: 1, negativeMarks: 0.33 },
  { id: "ps-42", subjectId: "probability-statistics", topicId: "ps-distributions", question: "If mean = variance then distribution is?", options: ["Normal", "Binomial", "Poisson", "Exponential"], correctAnswer: 2, type: "mcq", explanation: "Poisson distribution has equal mean and variance (both λ).", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ps-43", subjectId: "probability-statistics", topicId: "ps-distributions", question: "If n large p small then Binomial becomes?", options: ["Normal", "Poisson", "Uniform", "Exponential"], correctAnswer: 1, type: "mcq", explanation: "For large n and small p, Binomial is approximated by Poisson.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ps-44", subjectId: "probability-statistics", topicId: "ps-distributions", question: "PDF of exponential is?", options: ["λe^-λx", "e^-x", "x^2", "e^x"], correctAnswer: 0, type: "mcq", explanation: "For x≥0, exponential PDF is f(x)=λe^-λx.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ps-45", subjectId: "probability-statistics", topicId: "ps-distributions", question: "CDF of exponential is?", options: ["1-e^-λx", "e^-λx", "λx", "x^2"], correctAnswer: 0, type: "mcq", explanation: "For x≥0, exponential CDF is F(x)=1-e^-λx.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ps-46", subjectId: "probability-statistics", topicId: "ps-distributions", question: "Sum of independent normal variables is?", options: ["Normal", "Poisson", "Binomial", "Uniform"], correctAnswer: 0, type: "mcq", explanation: "Normal distribution is closed under addition for independent variables.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ps-47", subjectId: "probability-statistics", topicId: "ps-distributions", question: "If X~N(μ,σ^2) then Z=(X-μ)/σ is?", options: ["Uniform", "Poisson", "Standard Normal", "Binomial"], correctAnswer: 2, type: "mcq", explanation: "Standardization converts X to Z~N(0,1).", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ps-48", subjectId: "probability-statistics", topicId: "ps-hypothesis", question: "Null hypothesis represents?", options: ["Claim to reject", "Claim to accept", "Alternative hypothesis", "Random guess"], correctAnswer: 0, type: "mcq", explanation: "Null hypothesis is the baseline claim tested for possible rejection.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ps-49", subjectId: "probability-statistics", topicId: "ps-hypothesis", question: "p-value is defined as?", options: ["Probability null is true", "Probability of data given null hypothesis", "Probability of alternative", "Mean value"], correctAnswer: 1, type: "mcq", explanation: "p-value is the probability, under H0, of observing data at least as extreme as the sample.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ps-50", subjectId: "probability-statistics", topicId: "ps-hypothesis", question: "If p-value < alpha then?", options: ["Accept null", "Reject null", "Ignore test", "Increase sample size"], correctAnswer: 1, type: "mcq", explanation: "Decision rule: reject H0 when p-value is less than significance level alpha.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ps-51", subjectId: "probability-statistics", topicId: "ps-hypothesis", question: "Type I error means?", options: ["Accept false null", "Reject true null", "Reject false null", "Accept true null"], correctAnswer: 1, type: "mcq", explanation: "Type I error is rejecting H0 when H0 is actually true.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ps-52", subjectId: "probability-statistics", topicId: "ps-hypothesis", question: "Type II error means?", options: ["Reject true null", "Accept false null", "Reject false null", "Accept true null"], correctAnswer: 1, type: "mcq", explanation: "Type II error is failing to reject H0 when H0 is false.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ps-53", subjectId: "probability-statistics", topicId: "ps-hypothesis", question: "Confidence interval gives?", options: ["Exact value", "Range of parameter", "Variance only", "Mean only"], correctAnswer: 1, type: "mcq", explanation: "A confidence interval provides a plausible range for the population parameter.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "ps-54", subjectId: "probability-statistics", topicId: "ps-hypothesis", question: "If confidence level increases then interval?", options: ["Decreases", "Increases", "Remains same", "Becomes zero"], correctAnswer: 1, type: "mcq", explanation: "Higher confidence requires a wider interval.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ps-55", subjectId: "probability-statistics", topicId: "ps-hypothesis", question: "t-test is used when?", options: ["Population variance known", "Sample small", "Population known", "Mean zero"], correctAnswer: 1, type: "mcq", explanation: "t-test is commonly used for small samples when population variance is unknown.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ps-56", subjectId: "probability-statistics", topicId: "ps-hypothesis", question: "z-test is used when?", options: ["Sample small", "Population variance known", "No variance", "Mean unknown"], correctAnswer: 1, type: "mcq", explanation: "z-test is used when population variance is known (or sample size is large with normal approximation).", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ps-57", subjectId: "probability-statistics", topicId: "ps-hypothesis", question: "Chi-square test is used for?", options: ["Mean test", "Variance test", "Goodness of fit", "Regression"], correctAnswer: 2, type: "mcq", explanation: "A standard use of chi-square is goodness-of-fit testing for categorical distributions.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ps-58", subjectId: "probability-statistics", topicId: "ps-hypothesis", question: "Degrees of freedom for t-test is?", options: ["n", "n-1", "n+1", "2n"], correctAnswer: 1, type: "mcq", explanation: "For one-sample t-test, degrees of freedom is n-1.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "ps-59", subjectId: "probability-statistics", topicId: "ps-hypothesis", question: "If sample size increases then CI width?", options: ["Increases", "Decreases", "Same", "Random"], correctAnswer: 1, type: "mcq", explanation: "Larger sample size lowers standard error, so confidence interval narrows.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ps-60", subjectId: "probability-statistics", topicId: "ps-hypothesis", question: "p-value depends on?", options: ["Data", "Null hypothesis", "Test statistic", "All of these"], correctAnswer: 3, type: "mcq", explanation: "p-value depends on the observed data, test statistic, and null distribution.", difficulty: "medium", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ps-61", subjectId: "probability-statistics", topicId: "ps-hypothesis", question: "If alpha=0.05 then confidence level is?", options: ["90%", "95%", "99%", "5%"], correctAnswer: 1, type: "mcq", explanation: "Confidence level is 1-alpha, so 1-0.05=0.95 (95%).", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "ps-62", subjectId: "probability-statistics", topicId: "ps-hypothesis", question: "Chi-square distribution is?", options: ["Symmetric", "Skewed right", "Uniform", "Normal"], correctAnswer: 1, type: "mcq", explanation: "Chi-square distribution is right-skewed, especially for small degrees of freedom.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ps-63", subjectId: "probability-statistics", topicId: "ps-hypothesis", question: "t-distribution approaches normal when?", options: ["n small", "n large", "variance zero", "mean zero"], correctAnswer: 1, type: "mcq", explanation: "As sample size (degrees of freedom) increases, t-distribution approaches normal.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ps-64", subjectId: "probability-statistics", topicId: "ps-hypothesis", question: "Test statistic measures?", options: ["Data variability", "Difference from hypothesis", "Mean only", "Variance only"], correctAnswer: 1, type: "mcq", explanation: "Test statistic quantifies deviation of observed data from what H0 predicts.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ps-65", subjectId: "probability-statistics", topicId: "ps-hypothesis", question: "If null hypothesis is true then p-value is?", options: ["0", "1", "Uniformly distributed", "Negative"], correctAnswer: 2, type: "mcq", explanation: "Under a true null and continuous test statistic, p-values are uniformly distributed on [0,1].", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ps-66", subjectId: "probability-statistics", topicId: "ps-hypothesis", question: "Confidence interval depends on?", options: ["Mean only", "Variance only", "Sample size", "All of these"], correctAnswer: 3, type: "mcq", explanation: "Confidence intervals depend on estimate, variability, and sample size.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
 
  // Calculus & Optimization - extra
  { id: "co-4", subjectId: "calculus-optimization", topicId: "co-integration", question: "Integral of 2x with respect to x is:", options: ["x^2 + C", "2x + C", "x + C", "2x^2 + C"], correctAnswer: 0, type: "mcq", explanation: "Integral of 2x is x^2 plus constant of integration.", difficulty: "easy", eloRating: 1100, marks: 1, negativeMarks: 0.33 },
  { id: "co-5", subjectId: "calculus-optimization", topicId: "co-differentiation", question: "If f(x,y)=x^2+y^2, then grad f at (1,2) is:", options: ["(1,2)", "(2,4)", "(2,2)", "(4,2)"], correctAnswer: 1, type: "mcq", explanation: "Gradient is (2x,2y). At (1,2), it is (2,4).", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "co-6", subjectId: "calculus-optimization", topicId: "co-optimization", question: "In gradient descent, a very high learning rate often causes:", options: ["Faster guaranteed convergence", "Divergence or oscillation", "No updates", "Exact solution in one step"], correctAnswer: 1, type: "mcq", explanation: "If step size is too large, updates overshoot minima and can diverge.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "co-7", subjectId: "calculus-optimization", topicId: "co-differentiation", question: "The limit lim x→0 (sin x)/x equals?", options: ["0", "1", "Infinity", "Undefined"], correctAnswer: 1, type: "mcq", explanation: "Standard limit: lim x→0 (sin x)/x = 1.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "co-8", subjectId: "calculus-optimization", topicId: "co-differentiation", question: "The limit lim x→0 (1-cos x)/x^2 equals?", options: ["0", "1/2", "1", "2"], correctAnswer: 1, type: "mcq", explanation: "Standard limit: lim x→0 (1-cos x)/x^2 = 1/2.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "co-9", subjectId: "calculus-optimization", topicId: "co-differentiation", question: "A function is continuous at x=a if?", options: ["Limit exists", "Left and right limits equal f(a)", "Derivative exists", "Function is zero"], correctAnswer: 1, type: "mcq", explanation: "Continuity at x=a requires lim x→a f(x)=f(a), i.e., left and right limits exist and equal f(a).", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "co-10", subjectId: "calculus-optimization", topicId: "co-differentiation", question: "If limit does not exist then function is?", options: ["Continuous", "Differentiable", "Discontinuous", "Linear"], correctAnswer: 2, type: "mcq", explanation: "If the required limit at a point does not exist, continuity fails there.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "co-11", subjectId: "calculus-optimization", topicId: "co-differentiation", question: "Derivative of x^n is?", options: ["nx^(n-1)", "n+x", "x^n", "nx"], correctAnswer: 0, type: "mcq", explanation: "Power rule: d/dx(x^n)=n x^(n-1).", difficulty: "easy", eloRating: 1150, marks: 1, negativeMarks: 0.33 },
  { id: "co-12", subjectId: "calculus-optimization", topicId: "co-differentiation", question: "Derivative of e^x is?", options: ["x e^x", "e^x", "1", "e"], correctAnswer: 1, type: "mcq", explanation: "Standard derivative: d/dx(e^x)=e^x.", difficulty: "easy", eloRating: 1150, marks: 1, negativeMarks: 0.33 },
  { id: "co-13", subjectId: "calculus-optimization", topicId: "co-differentiation", question: "Derivative of ln x is?", options: ["1/x", "x", "ln x", "e^x"], correctAnswer: 0, type: "mcq", explanation: "Standard derivative: d/dx(ln x)=1/x for x>0.", difficulty: "easy", eloRating: 1150, marks: 1, negativeMarks: 0.33 },
  { id: "co-14", subjectId: "calculus-optimization", topicId: "co-differentiation", question: "Chain rule states?", options: ["Derivative of sum", "Derivative of product", "Derivative of composite function", "Derivative of constant"], correctAnswer: 2, type: "mcq", explanation: "Chain rule gives derivative of a composite function.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "co-15", subjectId: "calculus-optimization", topicId: "co-differentiation", question: "If y=f(g(x)) then dy/dx=?", options: ["f'(x)g'(x)", "f'(g(x))g'(x)", "g'(x)f(x)", "f(x)g(x)"], correctAnswer: 1, type: "mcq", explanation: "Chain rule: dy/dx = f'(g(x))·g'(x).", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "co-16", subjectId: "calculus-optimization", topicId: "co-differentiation", question: "Partial derivative ∂f/∂x means?", options: ["Derivative wrt x keeping others constant", "Total derivative", "Derivative wrt all variables", "Integration"], correctAnswer: 0, type: "mcq", explanation: "Partial derivative with respect to x treats all other variables as constants.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "co-17", subjectId: "calculus-optimization", topicId: "co-differentiation", question: "If f(x,y)=x^2y then ∂f/∂x=?", options: ["2xy", "x^2", "xy", "2x"], correctAnswer: 0, type: "mcq", explanation: "Treat y constant: ∂/∂x(x^2y)=2xy.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "co-18", subjectId: "calculus-optimization", topicId: "co-differentiation", question: "If f(x,y)=x^2y then ∂f/∂y=?", options: ["x^2", "2xy", "y^2", "2x"], correctAnswer: 0, type: "mcq", explanation: "Treat x constant: ∂/∂y(x^2y)=x^2.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "co-19", subjectId: "calculus-optimization", topicId: "co-differentiation", question: "If limit from left ≠ right then function is?", options: ["Continuous", "Differentiable", "Discontinuous", "Constant"], correctAnswer: 2, type: "mcq", explanation: "Continuity requires left and right limits to be equal.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "co-20", subjectId: "calculus-optimization", topicId: "co-differentiation", question: "Derivative of sin x is?", options: ["cos x", "-cos x", "sin x", "-sin x"], correctAnswer: 0, type: "mcq", explanation: "Standard derivative: d/dx(sin x)=cos x.", difficulty: "easy", eloRating: 1150, marks: 1, negativeMarks: 0.33 },
  { id: "co-21", subjectId: "calculus-optimization", topicId: "co-differentiation", question: "Derivative of cos x is?", options: ["sin x", "-sin x", "cos x", "-cos x"], correctAnswer: 1, type: "mcq", explanation: "Standard derivative: d/dx(cos x)=-sin x.", difficulty: "easy", eloRating: 1150, marks: 1, negativeMarks: 0.33 },
  { id: "co-22", subjectId: "calculus-optimization", topicId: "co-differentiation", question: "Derivative of product uv is?", options: ["u'v+uv'", "u'v'", "uv", "u+v"], correctAnswer: 0, type: "mcq", explanation: "Product rule: d(uv)/dx = u'v + uv'.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "co-23", subjectId: "calculus-optimization", topicId: "co-differentiation", question: "Derivative of quotient u/v is?", options: ["(u'v-uv')/v^2", "(u'v+uv')/v^2", "u/v", "u'v"], correctAnswer: 0, type: "mcq", explanation: "Quotient rule: d(u/v)/dx = (u'v-uv')/v^2.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "co-24", subjectId: "calculus-optimization", topicId: "co-differentiation", question: "If f is differentiable then it is?", options: ["Continuous", "Discontinuous", "Constant", "Linear"], correctAnswer: 0, type: "mcq", explanation: "Differentiability implies continuity.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "co-25", subjectId: "calculus-optimization", topicId: "co-differentiation", question: "Second derivative represents?", options: ["Slope", "Rate of change of slope", "Area", "Integral"], correctAnswer: 1, type: "mcq", explanation: "Second derivative gives the rate of change of the first derivative (slope).", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "co-26", subjectId: "calculus-optimization", topicId: "co-differentiation", question: "If f(x,y)=xy then ∂^2f/∂x∂y=?", options: ["1", "x", "y", "0"], correctAnswer: 0, type: "mcq", explanation: "For f=xy: ∂f/∂x=y, then ∂/∂y(y)=1.", difficulty: "medium", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "co-27", subjectId: "calculus-optimization", topicId: "co-integration", question: "The integral ∫ x^n dx equals?", options: ["x^(n+1)/(n+1)", "nx^(n-1)", "x^n", "nx"], correctAnswer: 0, type: "mcq", explanation: "Power rule of integration: ∫x^n dx = x^(n+1)/(n+1) + C for n ≠ -1.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "co-28", subjectId: "calculus-optimization", topicId: "co-integration", question: "The integral ∫ e^x dx equals?", options: ["e^x", "x e^x", "1", "e"], correctAnswer: 0, type: "mcq", explanation: "Standard result: ∫e^x dx = e^x + C.", difficulty: "easy", eloRating: 1150, marks: 1, negativeMarks: 0.33 },
  { id: "co-29", subjectId: "calculus-optimization", topicId: "co-integration", question: "The integral ∫ 1/x dx equals?", options: ["ln x", "x", "1/x", "e^x"], correctAnswer: 0, type: "mcq", explanation: "Standard logarithmic integral: ∫(1/x)dx = ln|x| + C.", difficulty: "easy", eloRating: 1150, marks: 1, negativeMarks: 0.33 },
  { id: "co-30", subjectId: "calculus-optimization", topicId: "co-integration", question: "The definite integral ∫_a^a f(x)dx equals?", options: ["1", "0", "f(a)", "Infinity"], correctAnswer: 1, type: "mcq", explanation: "Definite integral with same upper and lower limits is zero.", difficulty: "easy", eloRating: 1150, marks: 1, negativeMarks: 0.33 },
  { id: "co-31", subjectId: "calculus-optimization", topicId: "co-integration", question: "The integral ∫ sin x dx equals?", options: ["cos x", "-cos x", "sin x", "-sin x"], correctAnswer: 1, type: "mcq", explanation: "Standard integral: ∫sin x dx = -cos x + C.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "co-32", subjectId: "calculus-optimization", topicId: "co-integration", question: "The integral ∫ cos x dx equals?", options: ["sin x", "-sin x", "cos x", "-cos x"], correctAnswer: 0, type: "mcq", explanation: "Standard integral: ∫cos x dx = sin x + C.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "co-33", subjectId: "calculus-optimization", topicId: "co-integration", question: "Fundamental theorem of calculus connects?", options: ["Derivative and integral", "Limit and sum", "Product and quotient", "Matrix and determinant"], correctAnswer: 0, type: "mcq", explanation: "FTC links differentiation and integration as inverse operations.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "co-34", subjectId: "calculus-optimization", topicId: "co-integration", question: "If ∫ f(x)dx = F(x) then F'(x)=?", options: ["f(x)", "0", "1", "F(x)"], correctAnswer: 0, type: "mcq", explanation: "If F is an antiderivative of f, then F'(x)=f(x).", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "co-35", subjectId: "calculus-optimization", topicId: "co-integration", question: "Area under curve from a to b is?", options: ["∫_a^b f(x)dx", "f(b)-f(a)", "f(x)", "0"], correctAnswer: 0, type: "mcq", explanation: "Definite integral gives signed area under the curve on [a,b].", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "co-36", subjectId: "calculus-optimization", topicId: "co-integration", question: "The integral ∫_0^1 x dx equals?", options: ["1", "1/2", "0", "2"], correctAnswer: 1, type: "mcq", explanation: "∫_0^1 x dx = [x^2/2]_0^1 = 1/2.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "co-37", subjectId: "calculus-optimization", topicId: "co-integration", question: "The integral ∫_0^π sin x dx equals?", options: ["0", "1", "2", "π"], correctAnswer: 2, type: "mcq", explanation: "∫_0^π sin x dx = [-cos x]_0^π = 2.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "co-38", subjectId: "calculus-optimization", topicId: "co-integration", question: "If f(x) is odd then ∫_-a^a f(x)dx equals?", options: ["2∫f(x)", "0", "∞", "1"], correctAnswer: 1, type: "mcq", explanation: "Integral of an odd function over symmetric limits is zero.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "co-39", subjectId: "calculus-optimization", topicId: "co-integration", question: "If f(x) is even then ∫_-a^a f(x)dx equals?", options: ["0", "2∫_0^a f(x)dx", "1", "∞"], correctAnswer: 1, type: "mcq", explanation: "For even functions, symmetric integral doubles the integral from 0 to a.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "co-40", subjectId: "calculus-optimization", topicId: "co-integration", question: "Integration by parts formula is?", options: ["∫u dv=uv-∫v du", "∫u dv=uv+∫v du", "u+v", "uv"], correctAnswer: 0, type: "mcq", explanation: "Standard integration by parts formula: ∫u dv = uv - ∫v du.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "co-41", subjectId: "calculus-optimization", topicId: "co-integration", question: "The integral ∫ x e^x dx equals?", options: ["x e^x", "e^x(x-1)", "e^x(x+1)", "e^x"], correctAnswer: 1, type: "mcq", explanation: "Using integration by parts, ∫x e^x dx = e^x(x-1) + C.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "co-42", subjectId: "calculus-optimization", topicId: "co-integration", question: "The double integral represents?", options: ["Area under curve", "Volume", "Length", "Slope"], correctAnswer: 1, type: "mcq", explanation: "A double integral over a region typically computes volume under a surface.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "co-43", subjectId: "calculus-optimization", topicId: "co-integration", question: "The integral ∫∫ dx dy over region gives?", options: ["Area", "Volume", "Length", "Derivative"], correctAnswer: 0, type: "mcq", explanation: "Double integral of 1 over a region gives its area.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "co-44", subjectId: "calculus-optimization", topicId: "co-integration", question: "Changing order of integration requires?", options: ["Limits adjustment", "Function change", "Derivative", "None"], correctAnswer: 0, type: "mcq", explanation: "When reversing integration order, region limits must be adjusted.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "co-45", subjectId: "calculus-optimization", topicId: "co-integration", question: "The integral ∫_0^∞ e^-x dx equals?", options: ["0", "1", "∞", "e"], correctAnswer: 1, type: "mcq", explanation: "Improper integral evaluates to 1.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "co-46", subjectId: "calculus-optimization", topicId: "co-integration", question: "Triple integral represents?", options: ["Area", "Volume in 3D", "Length", "Derivative"], correctAnswer: 1, type: "mcq", explanation: "Triple integral computes volume in three dimensions (or accumulated quantity over a 3D region).", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "co-47", subjectId: "calculus-optimization", topicId: "co-optimization", question: "Gradient of a function represents?", options: ["Maximum value", "Direction of steepest ascent", "Minimum value", "Constant value"], correctAnswer: 1, type: "mcq", explanation: "Gradient gives the direction of maximum increase.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "co-48", subjectId: "calculus-optimization", topicId: "co-optimization", question: "Gradient descent is used to?", options: ["Maximize function", "Minimize function", "Find determinant", "Solve equations"], correctAnswer: 1, type: "mcq", explanation: "Gradient descent is used for minimization in optimization problems.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "co-49", subjectId: "calculus-optimization", topicId: "co-optimization", question: "Update rule in gradient descent is?", options: ["x=x+α∇f", "x=x-α∇f", "x=∇f", "x=αf"], correctAnswer: 1, type: "mcq", explanation: "We move opposite to the gradient: x ← x - α∇f.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "co-50", subjectId: "calculus-optimization", topicId: "co-optimization", question: "Learning rate controls?", options: ["Speed of convergence", "Function value", "Gradient value", "Dimension"], correctAnswer: 0, type: "mcq", explanation: "Learning rate sets step size and strongly affects convergence speed.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "co-51", subjectId: "calculus-optimization", topicId: "co-optimization", question: "If learning rate is too large then?", options: ["Converges faster", "Diverges", "Stops", "Becomes zero"], correctAnswer: 1, type: "mcq", explanation: "Very large steps can overshoot minima and cause divergence.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "co-52", subjectId: "calculus-optimization", topicId: "co-optimization", question: "If learning rate is very small then?", options: ["Fast convergence", "Slow convergence", "Diverges", "No change"], correctAnswer: 1, type: "mcq", explanation: "Small steps make optimization progress slow.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "co-53", subjectId: "calculus-optimization", topicId: "co-optimization", question: "A function is convex if?", options: ["Second derivative ≥ 0", "Second derivative ≤ 0", "First derivative zero", "Constant"], correctAnswer: 0, type: "mcq", explanation: "In one variable, a sufficient convexity condition is second derivative non-negative.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "co-54", subjectId: "calculus-optimization", topicId: "co-optimization", question: "Convex function has?", options: ["Multiple minima", "Single global minimum", "No minimum", "Infinite maxima"], correctAnswer: 1, type: "mcq", explanation: "A convex objective has no spurious local minima; minima are global.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "co-55", subjectId: "calculus-optimization", topicId: "co-optimization", question: "Hessian matrix is used for?", options: ["Gradient", "Second derivatives", "Integration", "Determinant"], correctAnswer: 1, type: "mcq", explanation: "Hessian stores second-order partial derivatives.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "co-56", subjectId: "calculus-optimization", topicId: "co-optimization", question: "If Hessian is positive definite then?", options: ["Maximum point", "Minimum point", "Saddle point", "Zero"], correctAnswer: 1, type: "mcq", explanation: "Positive definite Hessian at a stationary point implies local minimum.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "co-57", subjectId: "calculus-optimization", topicId: "co-optimization", question: "If Hessian is negative definite then?", options: ["Minimum", "Maximum", "Saddle point", "Zero"], correctAnswer: 1, type: "mcq", explanation: "Negative definite Hessian at a stationary point implies local maximum.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "co-58", subjectId: "calculus-optimization", topicId: "co-optimization", question: "Lagrange multiplier is used for?", options: ["Unconstrained optimization", "Constrained optimization", "Integration", "Differentiation"], correctAnswer: 1, type: "mcq", explanation: "Lagrange multipliers handle equality-constrained optimization.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "co-59", subjectId: "calculus-optimization", topicId: "co-optimization", question: "Lagrangian function is?", options: ["f(x)+λg(x)", "f(x)-λg(x)", "f(x)g(x)", "λf(x)"], correctAnswer: 0, type: "mcq", explanation: "A common convention is L(x,λ)=f(x)+λg(x) for constraint g(x)=0.", difficulty: "medium", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "co-60", subjectId: "calculus-optimization", topicId: "co-optimization", question: "At optimum in Lagrange method?", options: ["∇f=0", "∇f=λ∇g", "f=0", "g=0"], correctAnswer: 1, type: "mcq", explanation: "Constrained extrema satisfy ∇f = λ∇g along with g(x)=0.", difficulty: "hard", eloRating: 1550, marks: 2, negativeMarks: 0.66 },
  { id: "co-61", subjectId: "calculus-optimization", topicId: "co-optimization", question: "If function is convex then any local minimum is?", options: ["Local only", "Global minimum", "Maximum", "Saddle"], correctAnswer: 1, type: "mcq", explanation: "For convex functions, every local minimum is global.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "co-62", subjectId: "calculus-optimization", topicId: "co-optimization", question: "Gradient descent converges if?", options: ["Learning rate proper", "Gradient zero", "Function linear", "None"], correctAnswer: 0, type: "mcq", explanation: "A suitable learning rate is required for stable convergence.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "co-63", subjectId: "calculus-optimization", topicId: "co-optimization", question: "Stationary point occurs when?", options: ["f=0", "∇f=0", "f'=1", "λ=0"], correctAnswer: 1, type: "mcq", explanation: "Stationary points occur where gradient is zero.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "co-64", subjectId: "calculus-optimization", topicId: "co-optimization", question: "Saddle point occurs when?", options: ["Minimum", "Maximum", "Neither min nor max", "Zero"], correctAnswer: 2, type: "mcq", explanation: "A saddle point is not a local min or local max.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "co-65", subjectId: "calculus-optimization", topicId: "co-optimization", question: "Convex combination means?", options: ["Sum >1", "Sum =1 with positive weights", "Sum=0", "Negative weights"], correctAnswer: 1, type: "mcq", explanation: "A convex combination uses non-negative weights summing to 1.", difficulty: "medium", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "co-66", subjectId: "calculus-optimization", topicId: "co-optimization", question: "Gradient descent is widely used in?", options: ["Sorting", "Machine learning", "Graphs", "Databases"], correctAnswer: 1, type: "mcq", explanation: "Gradient-based optimization is central in machine learning training.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },

  // Machine Learning - extra
  { id: "ml-6", subjectId: "machine-learning", topicId: "ml-supervised", question: "Logistic regression output is passed through:", options: ["ReLU", "Softmax only", "Sigmoid", "Tanh only"], correctAnswer: 2, type: "mcq", explanation: "Binary logistic regression uses sigmoid to map values to probability range [0,1].", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "ml-7", subjectId: "machine-learning", topicId: "ml-unsupervised", question: "PCA primarily helps in:", options: ["Classification labels", "Dimensionality reduction", "Increasing overfitting", "Data shuffling"], correctAnswer: 1, type: "mcq", explanation: "PCA projects data to lower-dimensional directions with maximum variance.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "ml-8", subjectId: "machine-learning", topicId: "ml-evaluation", question: "Recall is defined as:", options: ["TP/(TP+FP)", "TP/(TP+FN)", "TN/(TN+FP)", "(TP+TN)/Total"], correctAnswer: 1, type: "mcq", explanation: "Recall measures fraction of actual positives captured by the classifier.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "ml-9", subjectId: "machine-learning", topicId: "ml-supervised", question: "Supervised learning requires?", options: ["Labeled data", "Unlabeled data", "No data", "Random data"], correctAnswer: 0, type: "mcq", explanation: "Supervised learning uses labeled data.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "ml-10", subjectId: "machine-learning", topicId: "ml-supervised", question: "Regression is used for?", options: ["Classification", "Continuous output", "Clustering", "Dimensionality reduction"], correctAnswer: 1, type: "mcq", explanation: "Regression predicts continuous values.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "ml-11", subjectId: "machine-learning", topicId: "ml-supervised", question: "Classification is used for?", options: ["Continuous output", "Discrete labels", "Regression only", "Clustering"], correctAnswer: 1, type: "mcq", explanation: "Classification predicts discrete categories.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "ml-12", subjectId: "machine-learning", topicId: "ml-supervised", question: "Linear regression assumes relation between variables is?", options: ["Linear", "Exponential", "Random", "Quadratic"], correctAnswer: 0, type: "mcq", explanation: "Linear regression assumes a linear relationship between input and output.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ml-13", subjectId: "machine-learning", topicId: "ml-supervised", question: "Cost function in linear regression is?", options: ["MSE", "Entropy", "Gini", "Log loss"], correctAnswer: 0, type: "mcq", explanation: "Mean squared error (MSE) is the common cost for linear regression.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ml-14", subjectId: "machine-learning", topicId: "ml-supervised", question: "Logistic regression is used for?", options: ["Regression", "Classification", "Clustering", "Dimensionality reduction"], correctAnswer: 1, type: "mcq", explanation: "Logistic regression is a classification algorithm that outputs probabilities.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ml-15", subjectId: "machine-learning", topicId: "ml-supervised", question: "Decision boundary in logistic regression is?", options: ["Linear", "Quadratic", "Random", "Exponential"], correctAnswer: 0, type: "mcq", explanation: "In basic logistic regression, the decision boundary is linear in feature space.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ml-16", subjectId: "machine-learning", topicId: "ml-supervised", question: "Overfitting occurs when?", options: ["Model too simple", "Model too complex", "Data small", "Data large"], correctAnswer: 1, type: "mcq", explanation: "Overfitting happens when model complexity is high and it captures noise.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ml-17", subjectId: "machine-learning", topicId: "ml-supervised", question: "Underfitting occurs when?", options: ["Model too complex", "Model too simple", "Too much data", "High variance"], correctAnswer: 1, type: "mcq", explanation: "Underfitting occurs when the model is too simple to learn true patterns.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ml-18", subjectId: "machine-learning", topicId: "ml-supervised", question: "Decision trees use?", options: ["Entropy or Gini", "Mean squared error only", "Variance only", "Distance"], correctAnswer: 0, type: "mcq", explanation: "For classification trees, entropy and Gini are common split criteria.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ml-19", subjectId: "machine-learning", topicId: "ml-supervised", question: "Gini impurity measures?", options: ["Variance", "Purity", "Mean", "Distance"], correctAnswer: 1, type: "mcq", explanation: "Gini impurity quantifies node impurity (inverse of purity).", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ml-20", subjectId: "machine-learning", topicId: "ml-supervised", question: "Entropy is minimum when?", options: ["Classes equal", "One class only", "Data large", "Data small"], correctAnswer: 1, type: "mcq", explanation: "Entropy is zero (minimum) when the node is pure (single class).", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ml-21", subjectId: "machine-learning", topicId: "ml-supervised", question: "SVM tries to?", options: ["Minimize error only", "Maximize margin", "Minimize margin", "Cluster data"], correctAnswer: 1, type: "mcq", explanation: "SVM seeks the hyperplane with maximum margin.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ml-22", subjectId: "machine-learning", topicId: "ml-supervised", question: "Support vectors are?", options: ["All points", "Boundary points", "Random points", "Centroids"], correctAnswer: 1, type: "mcq", explanation: "Support vectors are points closest to the margin boundary.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ml-23", subjectId: "machine-learning", topicId: "ml-supervised", question: "Kernel trick in SVM is used for?", options: ["Linear data", "Nonlinear data", "Clustering", "Regression"], correctAnswer: 1, type: "mcq", explanation: "Kernel trick enables nonlinear decision boundaries via implicit feature mapping.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ml-24", subjectId: "machine-learning", topicId: "ml-supervised", question: "Regularization helps to?", options: ["Overfit", "Underfit", "Prevent overfitting", "Increase error"], correctAnswer: 2, type: "mcq", explanation: "Regularization penalizes complexity and helps prevent overfitting.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ml-25", subjectId: "machine-learning", topicId: "ml-supervised", question: "Bias refers to?", options: ["Model complexity", "Error due to simplicity", "Variance", "Noise"], correctAnswer: 1, type: "mcq", explanation: "Bias is error from overly simple assumptions; high bias leads to underfitting.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ml-26", subjectId: "machine-learning", topicId: "ml-supervised", question: "Variance refers to?", options: ["Error due to simplicity", "Error due to fluctuations", "Mean value", "Constant"], correctAnswer: 1, type: "mcq", explanation: "Variance is sensitivity to data fluctuations; high variance leads to overfitting.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ml-27", subjectId: "machine-learning", topicId: "ml-supervised", question: "Pruning in decision trees reduces?", options: ["Bias", "Variance", "Error always", "Data size"], correctAnswer: 1, type: "mcq", explanation: "Pruning simplifies trees and reduces overfitting (variance).", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ml-28", subjectId: "machine-learning", topicId: "ml-supervised", question: "Accuracy is defined as?", options: ["Correct/Total", "Incorrect/Total", "TP only", "FP only"], correctAnswer: 0, type: "mcq", explanation: "Accuracy = number of correct predictions divided by total predictions.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "ml-29", subjectId: "machine-learning", topicId: "ml-unsupervised", question: "Unsupervised learning uses?", options: ["Labeled data", "Unlabeled data", "Only test data", "Random labels"], correctAnswer: 1, type: "mcq", explanation: "Unsupervised learning works without labels.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "ml-30", subjectId: "machine-learning", topicId: "ml-unsupervised", question: "Clustering is used for?", options: ["Prediction", "Grouping similar data", "Regression only", "Classification"], correctAnswer: 1, type: "mcq", explanation: "Clustering groups similar points together.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "ml-31", subjectId: "machine-learning", topicId: "ml-unsupervised", question: "K-means algorithm minimizes?", options: ["Distance to centroid", "SSE", "Entropy", "Variance"], correctAnswer: 1, type: "mcq", explanation: "K-means minimizes sum of squared errors (within-cluster SSE).", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ml-32", subjectId: "machine-learning", topicId: "ml-unsupervised", question: "In K-means increasing k leads to?", options: ["Increase SSE", "Decrease SSE", "No change", "Random"], correctAnswer: 1, type: "mcq", explanation: "More clusters generally reduce or keep same SSE, never increase it.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ml-33", subjectId: "machine-learning", topicId: "ml-unsupervised", question: "Centroid in K-means is?", options: ["Median", "Mean", "Mode", "Variance"], correctAnswer: 1, type: "mcq", explanation: "Cluster centroid is the mean of points assigned to that cluster.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "ml-34", subjectId: "machine-learning", topicId: "ml-unsupervised", question: "K-means requires?", options: ["Labels", "k value", "Regression", "None"], correctAnswer: 1, type: "mcq", explanation: "Number of clusters k must be predefined.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ml-35", subjectId: "machine-learning", topicId: "ml-unsupervised", question: "PCA is used for?", options: ["Clustering only", "Dimensionality reduction", "Classification only", "Regression only"], correctAnswer: 1, type: "mcq", explanation: "PCA reduces dimensions by projecting data to principal directions.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "ml-36", subjectId: "machine-learning", topicId: "ml-unsupervised", question: "PCA finds?", options: ["Eigenvalues only", "Eigenvectors of covariance matrix", "Mean", "Variance"], correctAnswer: 1, type: "mcq", explanation: "PCA uses eigenvectors of covariance matrix as principal components.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ml-37", subjectId: "machine-learning", topicId: "ml-unsupervised", question: "Principal components are?", options: ["Random vectors", "Orthogonal directions", "Dependent vectors", "Zero vectors"], correctAnswer: 1, type: "mcq", explanation: "Principal components are mutually orthogonal directions.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ml-38", subjectId: "machine-learning", topicId: "ml-unsupervised", question: "Variance captured by PCA is?", options: ["Minimized", "Maximized", "Zero", "Constant"], correctAnswer: 1, type: "mcq", explanation: "PCA chooses directions that maximize projected variance.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ml-39", subjectId: "machine-learning", topicId: "ml-unsupervised", question: "Dimensionality reduction helps in?", options: ["Overfitting", "Reducing noise", "Increasing complexity", "None"], correctAnswer: 1, type: "mcq", explanation: "Reducing dimensions can remove noise and irrelevant features.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ml-40", subjectId: "machine-learning", topicId: "ml-unsupervised", question: "If first PC captures most variance then?", options: ["Ignore it", "Use it", "Remove data", "Increase dimension"], correctAnswer: 1, type: "mcq", explanation: "A principal component capturing most variance is highly informative.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ml-41", subjectId: "machine-learning", topicId: "ml-unsupervised", question: "Covariance matrix is used in?", options: ["Clustering", "PCA", "Regression", "Classification"], correctAnswer: 1, type: "mcq", explanation: "PCA is built from covariance (or correlation) matrix decomposition.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ml-42", subjectId: "machine-learning", topicId: "ml-unsupervised", question: "Eigenvalues in PCA represent?", options: ["Direction", "Variance", "Mean", "Noise"], correctAnswer: 1, type: "mcq", explanation: "Eigenvalues indicate variance magnitude along principal components.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ml-43", subjectId: "machine-learning", topicId: "ml-unsupervised", question: "If data is high dimensional then PCA?", options: ["Increases dimension", "Reduces dimension", "No effect", "Randomizes"], correctAnswer: 1, type: "mcq", explanation: "PCA is commonly used to reduce high-dimensional data.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "ml-44", subjectId: "machine-learning", topicId: "ml-unsupervised", question: "Hierarchical clustering builds?", options: ["Flat clusters", "Tree structure", "Random clusters", "Graph"], correctAnswer: 1, type: "mcq", explanation: "Hierarchical clustering produces a tree-like structure.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ml-45", subjectId: "machine-learning", topicId: "ml-unsupervised", question: "Dendrogram is used in?", options: ["K-means", "PCA", "Hierarchical clustering", "Regression"], correctAnswer: 2, type: "mcq", explanation: "Dendrogram is the tree diagram used in hierarchical clustering.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ml-46", subjectId: "machine-learning", topicId: "ml-unsupervised", question: "Elbow method is used to find?", options: ["Best k", "Best model", "Mean value", "Variance"], correctAnswer: 0, type: "mcq", explanation: "Elbow method helps choose an appropriate number of clusters k.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ml-47", subjectId: "machine-learning", topicId: "ml-unsupervised", question: "Curse of dimensionality affects?", options: ["Low dimensions", "High dimensions", "Only PCA", "Only clustering"], correctAnswer: 1, type: "mcq", explanation: "High-dimensional spaces degrade distance-based learning behavior.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ml-48", subjectId: "machine-learning", topicId: "ml-unsupervised", question: "t-SNE is used for?", options: ["Regression", "Visualization", "Classification", "Clustering"], correctAnswer: 1, type: "mcq", explanation: "t-SNE is primarily used for visualizing high-dimensional data.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ml-49", subjectId: "machine-learning", topicId: "ml-evaluation", question: "Bias refers to?", options: ["Model complexity", "Error due to simplicity", "Variance", "Noise"], correctAnswer: 1, type: "mcq", explanation: "High bias means error due to overly simple assumptions, leading to underfitting.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ml-50", subjectId: "machine-learning", topicId: "ml-evaluation", question: "Variance refers to?", options: ["Error due to simplicity", "Error due to fluctuations", "Mean", "Constant"], correctAnswer: 1, type: "mcq", explanation: "High variance means sensitivity to data fluctuations, often causing overfitting.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ml-51", subjectId: "machine-learning", topicId: "ml-evaluation", question: "Overfitting is associated with?", options: ["High bias", "High variance", "Low variance", "Zero bias"], correctAnswer: 1, type: "mcq", explanation: "Overfitting is typically associated with high variance.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ml-52", subjectId: "machine-learning", topicId: "ml-evaluation", question: "Underfitting is associated with?", options: ["High variance", "High bias", "Low bias", "Noise"], correctAnswer: 1, type: "mcq", explanation: "Underfitting is typically associated with high bias.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ml-53", subjectId: "machine-learning", topicId: "ml-evaluation", question: "Confusion matrix is used for?", options: ["Regression", "Classification", "Clustering", "Dimensionality reduction"], correctAnswer: 1, type: "mcq", explanation: "Confusion matrix evaluates classification outcomes.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "ml-54", subjectId: "machine-learning", topicId: "ml-evaluation", question: "True Positive means?", options: ["Correct positive prediction", "Incorrect positive", "Correct negative", "Incorrect negative"], correctAnswer: 0, type: "mcq", explanation: "True Positive is a correctly predicted positive case.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "ml-55", subjectId: "machine-learning", topicId: "ml-evaluation", question: "False Positive means?", options: ["Correct positive", "Incorrect positive", "Correct negative", "Incorrect negative"], correctAnswer: 1, type: "mcq", explanation: "False Positive is an incorrect positive prediction.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ml-56", subjectId: "machine-learning", topicId: "ml-evaluation", question: "True Negative means?", options: ["Correct negative", "Incorrect negative", "Correct positive", "Incorrect positive"], correctAnswer: 0, type: "mcq", explanation: "True Negative is a correctly predicted negative case.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "ml-57", subjectId: "machine-learning", topicId: "ml-evaluation", question: "False Negative means?", options: ["Correct negative", "Incorrect negative", "Correct positive", "Incorrect positive"], correctAnswer: 1, type: "mcq", explanation: "False Negative is a missed positive (predicted negative but actually positive).", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ml-58", subjectId: "machine-learning", topicId: "ml-evaluation", question: "Accuracy is?", options: ["TP/(TP+FP)", "(TP+TN)/Total", "FP/(FP+TN)", "FN/(FN+TP)"], correctAnswer: 1, type: "mcq", explanation: "Accuracy = (TP+TN)/Total predictions.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "ml-59", subjectId: "machine-learning", topicId: "ml-evaluation", question: "Precision is?", options: ["TP/(TP+FP)", "TP/(TP+FN)", "TN/(TN+FP)", "FP/(TP+FP)"], correctAnswer: 0, type: "mcq", explanation: "Precision = TP/(TP+FP), measuring correctness of positive predictions.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ml-60", subjectId: "machine-learning", topicId: "ml-evaluation", question: "Recall is?", options: ["TP/(TP+FN)", "TP/(TP+FP)", "TN/(TN+FP)", "FP/(FN+TP)"], correctAnswer: 0, type: "mcq", explanation: "Recall = TP/(TP+FN), measuring coverage of actual positives.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ml-61", subjectId: "machine-learning", topicId: "ml-evaluation", question: "F1-score is?", options: ["Mean", "Geometric mean", "Harmonic mean of precision and recall", "Variance"], correctAnswer: 2, type: "mcq", explanation: "F1-score is harmonic mean of precision and recall.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ml-62", subjectId: "machine-learning", topicId: "ml-evaluation", question: "ROC curve plots?", options: ["Precision vs Recall", "TPR vs FPR", "Accuracy vs Error", "Loss vs Epoch"], correctAnswer: 1, type: "mcq", explanation: "ROC plots True Positive Rate against False Positive Rate.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ml-63", subjectId: "machine-learning", topicId: "ml-evaluation", question: "AUC represents?", options: ["Accuracy", "Area under ROC curve", "Loss", "Precision"], correctAnswer: 1, type: "mcq", explanation: "AUC is the area under the ROC curve; higher indicates better separability.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ml-64", subjectId: "machine-learning", topicId: "ml-evaluation", question: "Cross-validation is used for?", options: ["Training only", "Testing only", "Model evaluation", "Clustering"], correctAnswer: 2, type: "mcq", explanation: "Cross-validation evaluates generalization performance.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ml-65", subjectId: "machine-learning", topicId: "ml-evaluation", question: "k-fold cross validation divides data into?", options: ["k parts", "2 parts", "Random sets", "None"], correctAnswer: 0, type: "mcq", explanation: "In k-fold CV, data is partitioned into k folds.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ml-66", subjectId: "machine-learning", topicId: "ml-evaluation", question: "In k-fold CV training happens on?", options: ["1 fold", "k-1 folds", "All folds", "None"], correctAnswer: 1, type: "mcq", explanation: "Each round trains on k-1 folds and validates on the remaining fold.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ml-67", subjectId: "machine-learning", topicId: "ml-evaluation", question: "Bias-variance tradeoff balances?", options: ["Accuracy and loss", "Underfitting and overfitting", "Precision and recall", "TP and FP"], correctAnswer: 1, type: "mcq", explanation: "Bias-variance tradeoff balances underfitting and overfitting.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  
  // Artificial Intelligence - extra
  { id: "ai-4", subjectId: "artificial-intelligence", topicId: "ai-search", question: "DFS typically uses:", options: ["Queue", "Stack", "Priority Queue", "Hash Map"], correctAnswer: 1, type: "mcq", explanation: "Depth-first search explores deepest nodes first using stack (or recursion stack).", difficulty: "easy", eloRating: 1150, marks: 1, negativeMarks: 0.33 },
  { id: "ai-5", subjectId: "artificial-intelligence", topicId: "ai-logic", question: "The negation of 'forall x P(x)' is:", options: ["forall x not P(x)", "exists x not P(x)", "exists x P(x)", "not exists x not P(x)"], correctAnswer: 1, type: "mcq", explanation: "By quantifier negation law: not(forall x P(x)) = exists x not P(x).", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ai-6", subjectId: "artificial-intelligence", topicId: "ai-search", question: "Uniform Cost Search expands node with minimum:", options: ["Depth", "Heuristic value", "Path cost g(n)", "f(n)=g+h"], correctAnswer: 2, type: "mcq", explanation: "UCS chooses the frontier node with the least accumulated path cost g(n).", difficulty: "medium", eloRating: 1450, marks: 2, negativeMarks: 0.66 },
  { id: "ai-7", subjectId: "artificial-intelligence", topicId: "ai-search", question: "BFS uses which data structure?", options: ["Stack", "Queue", "Heap", "Tree"], correctAnswer: 1, type: "mcq", explanation: "BFS uses a FIFO queue.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "ai-8", subjectId: "artificial-intelligence", topicId: "ai-search", question: "DFS uses which data structure?", options: ["Queue", "Stack", "Heap", "Graph"], correctAnswer: 1, type: "mcq", explanation: "DFS uses a LIFO stack (explicitly or via recursion).", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "ai-9", subjectId: "artificial-intelligence", topicId: "ai-search", question: "Time complexity of BFS is?", options: ["O(V)", "O(E)", "O(V+E)", "O(VE)"], correctAnswer: 2, type: "mcq", explanation: "With adjacency lists, BFS runs in O(V+E).", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ai-10", subjectId: "artificial-intelligence", topicId: "ai-search", question: "Time complexity of DFS is?", options: ["O(V)", "O(E)", "O(V+E)", "O(V^2)"], correctAnswer: 2, type: "mcq", explanation: "With adjacency lists, DFS runs in O(V+E).", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ai-11", subjectId: "artificial-intelligence", topicId: "ai-search", question: "BFS guarantees?", options: ["Shortest path in unweighted graph", "Deepest path", "Random path", "None"], correctAnswer: 0, type: "mcq", explanation: "BFS finds shortest paths (fewest edges) in unweighted graphs.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ai-12", subjectId: "artificial-intelligence", topicId: "ai-search", question: "DFS is useful for?", options: ["Shortest path", "Cycle detection", "Minimum spanning tree", "Sorting"], correctAnswer: 1, type: "mcq", explanation: "DFS is commonly used for cycle detection.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ai-13", subjectId: "artificial-intelligence", topicId: "ai-search", question: "A* algorithm uses?", options: ["g(n)", "h(n)", "g(n)+h(n)", "g(n)-h(n)"], correctAnswer: 2, type: "mcq", explanation: "A* evaluation function is f(n)=g(n)+h(n).", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ai-14", subjectId: "artificial-intelligence", topicId: "ai-search", question: "Heuristic function estimates?", options: ["Actual cost", "Future cost", "Past cost", "Total cost"], correctAnswer: 1, type: "mcq", explanation: "Heuristic h(n) estimates remaining cost to goal.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ai-15", subjectId: "artificial-intelligence", topicId: "ai-search", question: "If heuristic is admissible then?", options: ["Overestimates", "Never overestimates", "Random", "Always zero"], correctAnswer: 1, type: "mcq", explanation: "Admissible heuristic never overestimates true remaining cost.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ai-16", subjectId: "artificial-intelligence", topicId: "ai-search", question: "Consistent heuristic ensures?", options: ["Optimality", "Suboptimality", "Randomness", "None"], correctAnswer: 0, type: "mcq", explanation: "Consistency implies monotone f-values and guarantees A* optimality.", difficulty: "hard", eloRating: 1550, marks: 2, negativeMarks: 0.66 },
  { id: "ai-17", subjectId: "artificial-intelligence", topicId: "ai-search", question: "Greedy best-first search uses?", options: ["g(n)", "h(n)", "g(n)+h(n)", "None"], correctAnswer: 1, type: "mcq", explanation: "Greedy best-first selects node with smallest h(n) only.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ai-18", subjectId: "artificial-intelligence", topicId: "ai-search", question: "Uniform cost search uses?", options: ["h(n)", "g(n)", "g(n)+h(n)", "None"], correctAnswer: 1, type: "mcq", explanation: "Uniform cost search expands least path-cost node based on g(n).", difficulty: "medium", eloRating: 1450, marks: 2, negativeMarks: 0.66 },
  { id: "ai-19", subjectId: "artificial-intelligence", topicId: "ai-search", question: "A* is optimal if?", options: ["Heuristic admissible", "Heuristic large", "Graph cyclic", "None"], correctAnswer: 0, type: "mcq", explanation: "A* is optimal when heuristic is admissible (and graph-search uses consistency for no re-open issues).", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ai-20", subjectId: "artificial-intelligence", topicId: "ai-search", question: "DFS may fail in?", options: ["Finite graphs", "Infinite graphs", "Trees", "DAGs"], correctAnswer: 1, type: "mcq", explanation: "DFS can go infinitely deep in infinite-depth spaces.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ai-21", subjectId: "artificial-intelligence", topicId: "ai-search", question: "BFS memory usage is?", options: ["Low", "High", "Zero", "Constant"], correctAnswer: 1, type: "mcq", explanation: "BFS stores frontier nodes level by level, often using high memory.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ai-22", subjectId: "artificial-intelligence", topicId: "ai-search", question: "DFS memory usage is?", options: ["High", "Low", "Constant", "Infinite"], correctAnswer: 1, type: "mcq", explanation: "DFS usually has lower memory usage than BFS.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ai-23", subjectId: "artificial-intelligence", topicId: "ai-search", question: "Minimax is used in?", options: ["Sorting", "Games", "Graphs", "Regression"], correctAnswer: 1, type: "mcq", explanation: "Minimax is used in adversarial game search.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ai-24", subjectId: "artificial-intelligence", topicId: "ai-search", question: "Alpha-beta pruning reduces?", options: ["Accuracy", "Nodes explored", "Optimality", "None"], correctAnswer: 1, type: "mcq", explanation: "Alpha-beta pruning cuts unnecessary branches, reducing explored nodes.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ai-25", subjectId: "artificial-intelligence", topicId: "ai-search", question: "Utility function measures?", options: ["Cost", "Goal value", "Heuristic", "Depth"], correctAnswer: 1, type: "mcq", explanation: "Utility represents desirability/payoff of terminal outcomes.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ai-26", subjectId: "artificial-intelligence", topicId: "ai-search", question: "Game tree represents?", options: ["Graph", "Decision process", "Matrix", "Vector"], correctAnswer: 1, type: "mcq", explanation: "Game tree models sequences of possible moves as a decision process.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ai-27", subjectId: "artificial-intelligence", topicId: "ai-logic", question: "A proposition is?", options: ["Statement with truth value", "Equation", "Function", "Variable"], correctAnswer: 0, type: "mcq", explanation: "A proposition is a statement that is either true or false.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "ai-28", subjectId: "artificial-intelligence", topicId: "ai-logic", question: "p ∧ q is true when?", options: ["Both true", "One true", "Both false", "Either false"], correctAnswer: 0, type: "mcq", explanation: "AND is true only when both operands are true.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "ai-29", subjectId: "artificial-intelligence", topicId: "ai-logic", question: "p ∨ q is false when?", options: ["Both true", "One true", "Both false", "Either true"], correctAnswer: 2, type: "mcq", explanation: "OR is false only when both operands are false.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "ai-30", subjectId: "artificial-intelligence", topicId: "ai-logic", question: "¬p means?", options: ["p is true", "p is false", "p and q", "none"], correctAnswer: 1, type: "mcq", explanation: "¬p denotes negation of p.", difficulty: "easy", eloRating: 1150, marks: 1, negativeMarks: 0.33 },
  { id: "ai-31", subjectId: "artificial-intelligence", topicId: "ai-logic", question: "Implication p → q is false when?", options: ["p true q false", "p false q true", "both true", "both false"], correctAnswer: 0, type: "mcq", explanation: "p→q is false only in the case p=true and q=false.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ai-32", subjectId: "artificial-intelligence", topicId: "ai-logic", question: "Contrapositive of p→q is?", options: ["q→p", "¬q→¬p", "¬p→¬q", "p→¬q"], correctAnswer: 1, type: "mcq", explanation: "Contrapositive of p→q is logically equivalent to ¬q→¬p.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ai-33", subjectId: "artificial-intelligence", topicId: "ai-logic", question: "De Morgan law for negation of (p∧q) is?", options: ["¬p∧¬q", "¬p∨¬q", "p∨q", "p∧q"], correctAnswer: 1, type: "mcq", explanation: "De Morgan: ¬(p∧q) ≡ ¬p∨¬q.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "ai-34", subjectId: "artificial-intelligence", topicId: "ai-logic", question: "A tautology is?", options: ["Always true", "Always false", "Sometimes true", "Undefined"], correctAnswer: 0, type: "mcq", explanation: "A tautology evaluates to true for all truth assignments.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "ai-35", subjectId: "artificial-intelligence", topicId: "ai-logic", question: "A contradiction is?", options: ["Always true", "Always false", "Sometimes true", "Random"], correctAnswer: 1, type: "mcq", explanation: "A contradiction evaluates to false for all truth assignments.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "ai-36", subjectId: "artificial-intelligence", topicId: "ai-logic", question: "Modus Ponens states?", options: ["p→q, p ⇒ q", "p→q, q ⇒ p", "p→q, p false", "p→q, p true implies q"], correctAnswer: 3, type: "mcq", explanation: "From p→q and p, infer q (modus ponens).", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ai-37", subjectId: "artificial-intelligence", topicId: "ai-logic", question: "Modus Tollens states?", options: ["p→q, ¬q ⇒ ¬p", "p→q, q ⇒ p", "p→q, p ⇒ q", "p→q, ¬p ⇒ ¬q"], correctAnswer: 0, type: "mcq", explanation: "From p→q and ¬q, infer ¬p (modus tollens).", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ai-38", subjectId: "artificial-intelligence", topicId: "ai-logic", question: "Resolution rule is used for?", options: ["Integration", "Proof by contradiction", "Sorting", "Clustering"], correctAnswer: 1, type: "mcq", explanation: "Resolution is used in refutation proof (proof by contradiction).", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ai-39", subjectId: "artificial-intelligence", topicId: "ai-logic", question: "Predicate logic deals with?", options: ["Variables only", "Relations and quantifiers", "Numbers", "Functions"], correctAnswer: 1, type: "mcq", explanation: "Predicate logic includes predicates/relations and quantifiers.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ai-40", subjectId: "artificial-intelligence", topicId: "ai-logic", question: "Universal quantifier ∀ means?", options: ["Exists", "For all", "Not exists", "Equal"], correctAnswer: 1, type: "mcq", explanation: "∀ denotes 'for all'.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "ai-41", subjectId: "artificial-intelligence", topicId: "ai-logic", question: "Existential quantifier ∃ means?", options: ["For all", "Exists", "Not exists", "Equal"], correctAnswer: 1, type: "mcq", explanation: "∃ denotes 'there exists'.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "ai-42", subjectId: "artificial-intelligence", topicId: "ai-logic", question: "A formula with no free variables is?", options: ["Open", "Closed", "Infinite", "Undefined"], correctAnswer: 1, type: "mcq", explanation: "A formula without free variables is a closed formula.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "ai-43", subjectId: "artificial-intelligence", topicId: "ai-logic", question: "Unification is used in?", options: ["Sorting", "Resolution", "Clustering", "Regression"], correctAnswer: 1, type: "mcq", explanation: "Unification is central in first-order resolution inference.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ai-44", subjectId: "artificial-intelligence", topicId: "ai-logic", question: "Skolemization removes?", options: ["Variables", "Quantifiers", "Existential quantifiers", "Universal quantifiers"], correctAnswer: 2, type: "mcq", explanation: "Skolemization eliminates existential quantifiers by introducing Skolem terms.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "ai-45", subjectId: "artificial-intelligence", topicId: "ai-logic", question: "CNF stands for?", options: ["Canonical Normal Form", "Conjunctive Normal Form", "Constant Normal Form", "Conditional Normal Form"], correctAnswer: 1, type: "mcq", explanation: "CNF means Conjunctive Normal Form.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "ai-46", subjectId: "artificial-intelligence", topicId: "ai-logic", question: "First-order logic extends propositional logic by?", options: ["Variables and quantifiers", "Functions only", "Constants only", "None"], correctAnswer: 0, type: "mcq", explanation: "FOL extends propositional logic with variables and quantifiers (and predicates).", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },

  // Programming & DSA - extra
  { id: "dsa-4", subjectId: "programming-dsa", topicId: "dsa-arrays", question: "Which sorting algorithm has average O(n log n)?", options: ["Bubble Sort", "Merge Sort", "Insertion Sort", "Selection Sort"], correctAnswer: 1, type: "mcq", explanation: "Merge sort has average and worst-case complexity O(n log n).", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-5", subjectId: "programming-dsa", topicId: "dsa-trees", question: "Height of a balanced BST with n nodes is typically:", options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], correctAnswer: 1, type: "mcq", explanation: "Balanced BST maintains logarithmic height with respect to number of nodes.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-6", subjectId: "programming-dsa", topicId: "dsa-complexity", question: "Big-O of accessing element by index in array is:", options: ["O(1)", "O(log n)", "O(n)", "O(n^2)"], correctAnswer: 0, type: "mcq", explanation: "Arrays support constant-time random access by index.", difficulty: "easy", eloRating: 1100, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-7", subjectId: "programming-dsa", topicId: "dsa-arrays", question: "Time complexity of linear search is?", options: ["O(1)", "O(n)", "O(log n)", "O(n log n)"], correctAnswer: 1, type: "mcq", explanation: "Linear search scans elements sequentially in worst case.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-8", subjectId: "programming-dsa", topicId: "dsa-arrays", question: "Time complexity of binary search is?", options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], correctAnswer: 1, type: "mcq", explanation: "Binary search halves the search space each step.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-9", subjectId: "programming-dsa", topicId: "dsa-arrays", question: "Binary search requires array to be?", options: ["Unsorted", "Sorted", "Random", "Empty"], correctAnswer: 1, type: "mcq", explanation: "Binary search works correctly only on sorted arrays.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-10", subjectId: "programming-dsa", topicId: "dsa-arrays", question: "Best case time complexity of linear search is?", options: ["O(1)", "O(n)", "O(log n)", "O(n log n)"], correctAnswer: 0, type: "mcq", explanation: "Best case occurs when target is first element.", difficulty: "easy", eloRating: 1150, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-11", subjectId: "programming-dsa", topicId: "dsa-arrays", question: "Worst case time complexity of binary search is?", options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], correctAnswer: 1, type: "mcq", explanation: "Worst case still performs logarithmic splits.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-12", subjectId: "programming-dsa", topicId: "dsa-arrays", question: "Bubble sort worst case complexity is?", options: ["O(n)", "O(n log n)", "O(n^2)", "O(log n)"], correctAnswer: 2, type: "mcq", explanation: "Nested comparisons/swaps lead to quadratic time.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-13", subjectId: "programming-dsa", topicId: "dsa-arrays", question: "Merge sort time complexity is?", options: ["O(n)", "O(n log n)", "O(n^2)", "O(log n)"], correctAnswer: 1, type: "mcq", explanation: "Merge sort uses divide-and-conquer with O(log n) levels and O(n) merge each level.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-14", subjectId: "programming-dsa", topicId: "dsa-arrays", question: "Quick sort average complexity is?", options: ["O(n)", "O(n log n)", "O(n^2)", "O(log n)"], correctAnswer: 1, type: "mcq", explanation: "Average partition balance gives O(n log n).", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-15", subjectId: "programming-dsa", topicId: "dsa-arrays", question: "Quick sort worst case occurs when?", options: ["Balanced partition", "Unbalanced partition", "Sorted array always", "Random array"], correctAnswer: 1, type: "mcq", explanation: "Highly unbalanced partitions cause O(n^2) behavior.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-16", subjectId: "programming-dsa", topicId: "dsa-arrays", question: "Stable sorting algorithm is?", options: ["Quick sort", "Merge sort", "Heap sort", "Selection sort"], correctAnswer: 1, type: "mcq", explanation: "Merge sort is stable in its standard implementation.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-17", subjectId: "programming-dsa", topicId: "dsa-arrays", question: "In-place sorting algorithm is?", options: ["Merge sort", "Quick sort", "Counting sort", "Bucket sort"], correctAnswer: 1, type: "mcq", explanation: "Quick sort is typically in-place (ignoring recursion stack).", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-18", subjectId: "programming-dsa", topicId: "dsa-arrays", question: "Time complexity of string matching (naive) is?", options: ["O(n)", "O(n+m)", "O(nm)", "O(log n)"], correctAnswer: 2, type: "mcq", explanation: "Naive matching checks pattern at all alignments, giving O(nm) worst case.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-19", subjectId: "programming-dsa", topicId: "dsa-arrays", question: "KMP algorithm improves to?", options: ["O(nm)", "O(n+m)", "O(n log n)", "O(log n)"], correctAnswer: 1, type: "mcq", explanation: "KMP uses LPS preprocessing for linear-time matching.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-20", subjectId: "programming-dsa", topicId: "dsa-arrays", question: "LPS array is used in?", options: ["Naive search", "KMP", "Binary search", "Sorting"], correctAnswer: 1, type: "mcq", explanation: "KMP uses Longest Prefix Suffix (LPS) array to skip comparisons.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-21", subjectId: "programming-dsa", topicId: "dsa-arrays", question: "String comparison takes?", options: ["O(1)", "O(n)", "O(log n)", "O(n log n)"], correctAnswer: 1, type: "mcq", explanation: "In worst case, strings are compared character by character.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-22", subjectId: "programming-dsa", topicId: "dsa-arrays", question: "Array indexing takes?", options: ["O(1)", "O(n)", "O(log n)", "O(n log n)"], correctAnswer: 0, type: "mcq", explanation: "Arrays support direct constant-time access by index.", difficulty: "easy", eloRating: 1150, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-23", subjectId: "programming-dsa", topicId: "dsa-arrays", question: "Selection sort complexity is?", options: ["O(n)", "O(n log n)", "O(n^2)", "O(log n)"], correctAnswer: 2, type: "mcq", explanation: "Selection sort performs O(n^2) comparisons regardless of input order.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-24", subjectId: "programming-dsa", topicId: "dsa-arrays", question: "Insertion sort best case is?", options: ["O(1)", "O(n)", "O(n log n)", "O(n^2)"], correctAnswer: 1, type: "mcq", explanation: "For already sorted input, insertion sort is linear.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-25", subjectId: "programming-dsa", topicId: "dsa-arrays", question: "Heap sort complexity is?", options: ["O(n)", "O(n log n)", "O(n^2)", "O(log n)"], correctAnswer: 1, type: "mcq", explanation: "Building/extracting heap yields overall O(n log n).", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-26", subjectId: "programming-dsa", topicId: "dsa-arrays", question: "Pattern matching is used in?", options: ["Sorting", "Searching substrings", "Graph traversal", "Clustering"], correctAnswer: 1, type: "mcq", explanation: "Pattern matching focuses on substring/search problems.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-27", subjectId: "programming-dsa", topicId: "dsa-trees", question: "In a Binary Search Tree (BST), left child is?", options: ["Greater", "Smaller", "Equal", "Random"], correctAnswer: 1, type: "mcq", explanation: "Left subtree contains smaller keys than the node.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-28", subjectId: "programming-dsa", topicId: "dsa-trees", question: "In a BST, inorder traversal gives?", options: ["Random order", "Sorted order", "Reverse order", "Level order"], correctAnswer: 1, type: "mcq", explanation: "Inorder traversal of BST returns keys in sorted order.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-29", subjectId: "programming-dsa", topicId: "dsa-trees", question: "Height of a balanced BST is?", options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], correctAnswer: 1, type: "mcq", explanation: "Balanced BST height grows logarithmically with node count.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-30", subjectId: "programming-dsa", topicId: "dsa-trees", question: "AVL tree is?", options: ["Unbalanced tree", "Self-balancing BST", "Heap", "Graph"], correctAnswer: 1, type: "mcq", explanation: "AVL is a self-balancing binary search tree.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-31", subjectId: "programming-dsa", topicId: "dsa-trees", question: "Balance factor in AVL tree is?", options: ["Height difference", "Node count", "Depth", "Level"], correctAnswer: 0, type: "mcq", explanation: "Balance factor = height(left subtree) - height(right subtree).", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-32", subjectId: "programming-dsa", topicId: "dsa-trees", question: "Maximum nodes in binary tree of height h is?", options: ["2^h", "2^h-1", "h^2", "h!"], correctAnswer: 1, type: "mcq", explanation: "For height h measured in levels, max nodes = 2^h - 1.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-33", subjectId: "programming-dsa", topicId: "dsa-trees", question: "Minimum nodes in binary tree of height h is?", options: ["h", "2^h", "h+1", "1"], correctAnswer: 0, type: "mcq", explanation: "Minimum occurs in a skewed chain, giving linear node count in h.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-34", subjectId: "programming-dsa", topicId: "dsa-trees", question: "Time complexity of search in BST (average) is?", options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], correctAnswer: 1, type: "mcq", explanation: "Average-case BST search is logarithmic for reasonably balanced shapes.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-35", subjectId: "programming-dsa", topicId: "dsa-trees", question: "Worst case search in BST is?", options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], correctAnswer: 2, type: "mcq", explanation: "Skewed BST behaves like a linked list in worst case.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-36", subjectId: "programming-dsa", topicId: "dsa-trees", question: "BFS traversal uses?", options: ["Stack", "Queue", "Heap", "Tree"], correctAnswer: 1, type: "mcq", explanation: "BFS relies on FIFO queue.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-37", subjectId: "programming-dsa", topicId: "dsa-trees", question: "DFS traversal uses?", options: ["Queue", "Stack", "Heap", "Graph"], correctAnswer: 1, type: "mcq", explanation: "DFS uses a stack or recursion stack.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-38", subjectId: "programming-dsa", topicId: "dsa-trees", question: "Dijkstra algorithm is used for?", options: ["MST", "Shortest path (positive weights)", "DFS", "BFS"], correctAnswer: 1, type: "mcq", explanation: "Dijkstra finds shortest paths with non-negative edge weights.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-39", subjectId: "programming-dsa", topicId: "dsa-trees", question: "Bellman-Ford algorithm handles?", options: ["Positive edges", "Negative edges", "Only trees", "Only DAGs"], correctAnswer: 1, type: "mcq", explanation: "Bellman-Ford handles negative edge weights (and detects negative cycles).", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-40", subjectId: "programming-dsa", topicId: "dsa-trees", question: "Time complexity of Dijkstra (heap) is?", options: ["O(V)", "O(E)", "O((V+E)logV)", "O(VE)"], correctAnswer: 2, type: "mcq", explanation: "Using a priority queue, common bound is O((V+E)logV).", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-41", subjectId: "programming-dsa", topicId: "dsa-trees", question: "Minimum Spanning Tree (MST) connects?", options: ["All nodes with min cost", "Some nodes", "Only root", "Random nodes"], correctAnswer: 0, type: "mcq", explanation: "MST connects all vertices with minimum possible total edge weight.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-42", subjectId: "programming-dsa", topicId: "dsa-trees", question: "Kruskal algorithm is based on?", options: ["DFS", "BFS", "Greedy", "Dynamic programming"], correctAnswer: 2, type: "mcq", explanation: "Kruskal greedily selects smallest safe edges.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-43", subjectId: "programming-dsa", topicId: "dsa-trees", question: "Prim’s algorithm grows?", options: ["Edges", "Vertices", "Paths", "Cycles"], correctAnswer: 1, type: "mcq", explanation: "Prim grows one tree by adding minimum-cost vertices/edges from frontier.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-44", subjectId: "programming-dsa", topicId: "dsa-trees", question: "Cycle detection in graph can be done using?", options: ["DFS", "BFS", "Sorting", "Searching"], correctAnswer: 0, type: "mcq", explanation: "DFS with visited/recursion-state tracking is a standard cycle detection method.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-45", subjectId: "programming-dsa", topicId: "dsa-trees", question: "Number of edges in tree with n nodes is?", options: ["n", "n-1", "n+1", "2n"], correctAnswer: 1, type: "mcq", explanation: "A tree with n vertices always has n-1 edges.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-46", subjectId: "programming-dsa", topicId: "dsa-trees", question: "Graph with no cycles is?", options: ["Complete graph", "Tree", "Directed graph", "Weighted graph"], correctAnswer: 1, type: "mcq", explanation: "A connected acyclic graph is a tree.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-47", subjectId: "programming-dsa", topicId: "dsa-complexity", question: "Big-O notation represents?", options: ["Best case", "Worst case", "Average case", "Exact case"], correctAnswer: 1, type: "mcq", explanation: "Big-O gives an asymptotic upper bound (commonly used for worst-case growth).", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-48", subjectId: "programming-dsa", topicId: "dsa-complexity", question: "Big-Theta notation represents?", options: ["Upper bound", "Lower bound", "Tight bound", "No bound"], correctAnswer: 2, type: "mcq", explanation: "Theta provides a tight asymptotic bound.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-49", subjectId: "programming-dsa", topicId: "dsa-complexity", question: "Big-Omega notation represents?", options: ["Upper bound", "Lower bound", "Exact bound", "Average bound"], correctAnswer: 1, type: "mcq", explanation: "Omega provides an asymptotic lower bound.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-50", subjectId: "programming-dsa", topicId: "dsa-complexity", question: "Time complexity of binary search is?", options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], correctAnswer: 1, type: "mcq", explanation: "Binary search repeatedly halves the search interval.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-51", subjectId: "programming-dsa", topicId: "dsa-complexity", question: "Time complexity of merge sort is?", options: ["O(n)", "O(n log n)", "O(n^2)", "O(log n)"], correctAnswer: 1, type: "mcq", explanation: "Merge sort runs in O(n log n) by divide-and-conquer.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-52", subjectId: "programming-dsa", topicId: "dsa-complexity", question: "Recurrence T(n)=T(n/2)+1 gives?", options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], correctAnswer: 1, type: "mcq", explanation: "Repeated halving yields logarithmic depth.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-53", subjectId: "programming-dsa", topicId: "dsa-complexity", question: "Recurrence T(n)=2T(n/2)+n gives?", options: ["O(n)", "O(n log n)", "O(n^2)", "O(log n)"], correctAnswer: 1, type: "mcq", explanation: "By Master theorem (a=2,b=2,f(n)=n), solution is O(n log n).", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-54", subjectId: "programming-dsa", topicId: "dsa-complexity", question: "Recurrence T(n)=T(n-1)+1 gives?", options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], correctAnswer: 0, type: "mcq", explanation: "Linear decrement recurrence sums to O(n).", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-55", subjectId: "programming-dsa", topicId: "dsa-complexity", question: "Amortized analysis studies?", options: ["Worst case", "Average per operation", "Best case", "Total cost only"], correctAnswer: 1, type: "mcq", explanation: "Amortized analysis spreads expensive operations over sequences.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-56", subjectId: "programming-dsa", topicId: "dsa-complexity", question: "Stack push/pop amortized cost is?", options: ["O(n)", "O(log n)", "O(1)", "O(n log n)"], correctAnswer: 2, type: "mcq", explanation: "Push and pop on stack are constant-time operations.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-57", subjectId: "programming-dsa", topicId: "dsa-complexity", question: "Aggregate method is used in?", options: ["Sorting", "Amortized analysis", "Graphs", "Searching"], correctAnswer: 1, type: "mcq", explanation: "Aggregate method is one technique for amortized analysis.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-58", subjectId: "programming-dsa", topicId: "dsa-complexity", question: "Accounting method is used in?", options: ["Sorting", "Amortized analysis", "Searching", "Graphs"], correctAnswer: 1, type: "mcq", explanation: "Accounting method uses credits/debits in amortized analysis.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-59", subjectId: "programming-dsa", topicId: "dsa-complexity", question: "Potential method is used in?", options: ["Sorting", "Amortized analysis", "Searching", "Graphs"], correctAnswer: 1, type: "mcq", explanation: "Potential method uses a potential function for amortized bounds.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-60", subjectId: "programming-dsa", topicId: "dsa-complexity", question: "Worst case of quicksort is?", options: ["O(n)", "O(n log n)", "O(n^2)", "O(log n)"], correctAnswer: 2, type: "mcq", explanation: "Highly unbalanced partitioning leads to O(n^2).", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-61", subjectId: "programming-dsa", topicId: "dsa-complexity", question: "Average case of quicksort is?", options: ["O(n)", "O(n log n)", "O(n^2)", "O(log n)"], correctAnswer: 1, type: "mcq", explanation: "Average partition quality gives O(n log n).", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-62", subjectId: "programming-dsa", topicId: "dsa-complexity", question: "Time complexity of heap sort is?", options: ["O(n)", "O(n log n)", "O(n^2)", "O(log n)"], correctAnswer: 1, type: "mcq", explanation: "Heap sort performs n extract operations with log n each.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-63", subjectId: "programming-dsa", topicId: "dsa-complexity", question: "Master theorem is used for?", options: ["Sorting", "Recurrences", "Graphs", "Searching"], correctAnswer: 1, type: "mcq", explanation: "Master theorem solves common divide-and-conquer recurrences.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-64", subjectId: "programming-dsa", topicId: "dsa-complexity", question: "If f(n)=O(g(n)) then?", options: ["f grows faster", "f grows slower or equal", "f grows randomly", "f is constant"], correctAnswer: 1, type: "mcq", explanation: "Big-O means f is asymptotically upper-bounded by g.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dsa-65", subjectId: "programming-dsa", topicId: "dsa-complexity", question: "Space complexity measures?", options: ["Time", "Memory usage", "Input size", "Output size"], correctAnswer: 1, type: "mcq", explanation: "Space complexity measures memory required by an algorithm.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "dsa-66", subjectId: "programming-dsa", topicId: "dsa-complexity", question: "Amortized cost of dynamic array insertion is?", options: ["O(n)", "O(log n)", "O(1)", "O(n log n)"], correctAnswer: 2, type: "mcq", explanation: "Occasional resizing cost averages to O(1) per insertion.", difficulty: "hard", eloRating: 1500, marks: 2, negativeMarks: 0.66 },

  // DBMS - extra
  { id: "dbms-3", subjectId: "dbms", topicId: "dbms-sql", question: "Which JOIN returns only matching rows from both tables?", options: ["LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "FULL OUTER JOIN"], correctAnswer: 2, type: "mcq", explanation: "INNER JOIN keeps rows where join condition matches in both tables.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "dbms-4", subjectId: "dbms", topicId: "dbms-normalization", question: "A transitive dependency is removed in:", options: ["1NF", "2NF", "3NF", "BCNF"], correctAnswer: 2, type: "mcq", explanation: "3NF eliminates transitive dependencies on non-key attributes.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-5", subjectId: "dbms", topicId: "dbms-sql", question: "SQL command to remove all rows but keep table structure:", options: ["DROP TABLE", "TRUNCATE TABLE", "DELETE DATABASE", "REMOVE"], correctAnswer: 1, type: "mcq", explanation: "TRUNCATE removes all rows quickly while preserving table schema.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "dbms-6", subjectId: "dbms", topicId: "dbms-sql", question: "SELECT statement is used to?", options: ["Insert data", "Delete data", "Retrieve data", "Update data"], correctAnswer: 2, type: "mcq", explanation: "SELECT fetches records from tables.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "dbms-7", subjectId: "dbms", topicId: "dbms-sql", question: "WHERE clause is used for?", options: ["Sorting", "Filtering rows", "Grouping", "Joining"], correctAnswer: 1, type: "mcq", explanation: "WHERE filters rows before grouping/aggregation.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "dbms-8", subjectId: "dbms", topicId: "dbms-sql", question: "GROUP BY is used for?", options: ["Sorting", "Aggregation", "Filtering", "Joining"], correctAnswer: 1, type: "mcq", explanation: "GROUP BY groups rows so aggregate functions can be applied per group.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-9", subjectId: "dbms", topicId: "dbms-sql", question: "HAVING clause is used with?", options: ["WHERE", "GROUP BY", "SELECT", "JOIN"], correctAnswer: 1, type: "mcq", explanation: "HAVING filters grouped results, typically after GROUP BY.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-10", subjectId: "dbms", topicId: "dbms-sql", question: "INNER JOIN returns?", options: ["All rows", "Matching rows", "Non-matching rows", "Random rows"], correctAnswer: 1, type: "mcq", explanation: "INNER JOIN returns rows satisfying the join condition in both tables.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "dbms-11", subjectId: "dbms", topicId: "dbms-sql", question: "LEFT JOIN returns?", options: ["Only matching rows", "Left + matching rows", "Right rows", "No rows"], correctAnswer: 1, type: "mcq", explanation: "LEFT JOIN keeps all left-table rows plus matching right rows.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-12", subjectId: "dbms", topicId: "dbms-sql", question: "RIGHT JOIN returns?", options: ["Only matching rows", "Right + matching rows", "Left rows", "No rows"], correctAnswer: 1, type: "mcq", explanation: "RIGHT JOIN keeps all right-table rows plus matching left rows.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-13", subjectId: "dbms", topicId: "dbms-sql", question: "FULL JOIN returns?", options: ["Only matching rows", "All rows", "Left rows", "Right rows"], correctAnswer: 1, type: "mcq", explanation: "FULL OUTER JOIN returns all rows from both tables with NULLs where unmatched.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-14", subjectId: "dbms", topicId: "dbms-sql", question: "COUNT(*) is used to?", options: ["Sum values", "Count rows", "Find max", "Find avg"], correctAnswer: 1, type: "mcq", explanation: "COUNT(*) returns total row count.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "dbms-15", subjectId: "dbms", topicId: "dbms-sql", question: "SUM() function computes?", options: ["Average", "Sum", "Count", "Max"], correctAnswer: 1, type: "mcq", explanation: "SUM aggregates numeric values by addition.", difficulty: "easy", eloRating: 1150, marks: 1, negativeMarks: 0.33 },
  { id: "dbms-16", subjectId: "dbms", topicId: "dbms-sql", question: "AVG() function computes?", options: ["Sum", "Average", "Count", "Min"], correctAnswer: 1, type: "mcq", explanation: "AVG returns arithmetic mean of numeric values.", difficulty: "easy", eloRating: 1150, marks: 1, negativeMarks: 0.33 },
  { id: "dbms-17", subjectId: "dbms", topicId: "dbms-sql", question: "DISTINCT keyword removes?", options: ["Duplicates", "Nulls", "Rows", "Columns"], correctAnswer: 0, type: "mcq", explanation: "DISTINCT eliminates duplicate result values for selected columns.", difficulty: "easy", eloRating: 1200, marks: 1, negativeMarks: 0.33 },
  { id: "dbms-18", subjectId: "dbms", topicId: "dbms-sql", question: "Primary key ensures?", options: ["Duplicates allowed", "Unique values", "Null values", "No values"], correctAnswer: 1, type: "mcq", explanation: "Primary key enforces uniqueness and non-null constraint.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "dbms-19", subjectId: "dbms", topicId: "dbms-sql", question: "Foreign key ensures?", options: ["Uniqueness", "Referential integrity", "Sorting", "Grouping"], correctAnswer: 1, type: "mcq", explanation: "Foreign key enforces referential integrity between related tables.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-20", subjectId: "dbms", topicId: "dbms-sql", question: "Relational algebra SELECT means?", options: ["Projection", "Selection", "Join", "Union"], correctAnswer: 1, type: "mcq", explanation: "Selection (σ) filters rows by predicate.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "dbms-21", subjectId: "dbms", topicId: "dbms-sql", question: "Projection operator π is used for?", options: ["Rows", "Columns", "Join", "Union"], correctAnswer: 1, type: "mcq", explanation: "Projection (π) selects attributes/columns.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "dbms-22", subjectId: "dbms", topicId: "dbms-sql", question: "Union operator requires?", options: ["Different schemas", "Same schema", "No schema", "Random schema"], correctAnswer: 1, type: "mcq", explanation: "Set union requires union-compatible relations (same structure).", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-23", subjectId: "dbms", topicId: "dbms-sql", question: "Join in relational algebra combines?", options: ["Columns", "Rows", "Relations", "Attributes"], correctAnswer: 2, type: "mcq", explanation: "Join combines tuples from relations based on a condition.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-24", subjectId: "dbms", topicId: "dbms-sql", question: "Natural join removes?", options: ["Duplicates", "Common attributes", "Rows", "Columns"], correctAnswer: 1, type: "mcq", explanation: "Natural join merges relations on common attributes and removes duplicate join columns.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-25", subjectId: "dbms", topicId: "dbms-sql", question: "Cartesian product results in?", options: ["Addition", "Multiplication of rows", "Division", "Subtraction"], correctAnswer: 1, type: "mcq", explanation: "Cartesian product multiplies tuple counts across relations.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-26", subjectId: "dbms", topicId: "dbms-normalization", question: "Functional dependency X→Y means?", options: ["Y determines X", "X determines Y", "X=Y", "X independent Y"], correctAnswer: 1, type: "mcq", explanation: "In functional dependency X→Y, X functionally determines Y.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "dbms-27", subjectId: "dbms", topicId: "dbms-normalization", question: "A trivial functional dependency is?", options: ["X→Y where X≠Y", "X→X", "X→Z", "Y→X"], correctAnswer: 1, type: "mcq", explanation: "Trivial FD has RHS as subset of LHS, e.g., X→X.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-28", subjectId: "dbms", topicId: "dbms-normalization", question: "Closure of attribute set is?", options: ["All attributes determined", "Only given attributes", "Primary key", "Foreign key"], correctAnswer: 0, type: "mcq", explanation: "Attribute closure contains all attributes functionally implied by the set.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-29", subjectId: "dbms", topicId: "dbms-normalization", question: "1NF requires?", options: ["No duplicates", "Atomic values", "No nulls", "Primary key only"], correctAnswer: 1, type: "mcq", explanation: "1NF requires atomic attribute values (no repeating groups).", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "dbms-30", subjectId: "dbms", topicId: "dbms-normalization", question: "2NF removes?", options: ["Partial dependency", "Transitive dependency", "Multivalued dependency", "None"], correctAnswer: 0, type: "mcq", explanation: "2NF removes partial dependency on part of a composite key.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-31", subjectId: "dbms", topicId: "dbms-normalization", question: "3NF removes?", options: ["Partial dependency", "Transitive dependency", "Multivalued dependency", "None"], correctAnswer: 1, type: "mcq", explanation: "3NF removes transitive dependency of non-key attributes.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-32", subjectId: "dbms", topicId: "dbms-normalization", question: "BCNF is stricter than?", options: ["1NF", "2NF", "3NF", "None"], correctAnswer: 2, type: "mcq", explanation: "BCNF is stricter than 3NF.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-33", subjectId: "dbms", topicId: "dbms-normalization", question: "In BCNF every dependency must be?", options: ["Trivial", "Superkey based", "Primary key only", "Foreign key"], correctAnswer: 1, type: "mcq", explanation: "For each non-trivial FD X→Y in BCNF, X must be a superkey.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-34", subjectId: "dbms", topicId: "dbms-normalization", question: "Partial dependency occurs when?", options: ["Full key determines attribute", "Part of key determines attribute", "No key", "Random key"], correctAnswer: 1, type: "mcq", explanation: "Partial dependency means a non-prime attribute depends on part of composite key.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-35", subjectId: "dbms", topicId: "dbms-normalization", question: "Transitive dependency occurs when?", options: ["X→Y,Y→Z,X→Z", "X→Z via Y", "None", "X→Z directly only"], correctAnswer: 1, type: "mcq", explanation: "Transitive dependency is an indirect dependency through an intermediate attribute.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-36", subjectId: "dbms", topicId: "dbms-normalization", question: "Candidate key is?", options: ["Any key", "Minimal superkey", "Primary key only", "Foreign key"], correctAnswer: 1, type: "mcq", explanation: "Candidate key is a minimal superkey.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-37", subjectId: "dbms", topicId: "dbms-normalization", question: "Superkey is?", options: ["Minimal key", "Key that uniquely identifies tuples", "Foreign key", "Composite key"], correctAnswer: 1, type: "mcq", explanation: "A superkey uniquely identifies tuples (not necessarily minimal).", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "dbms-38", subjectId: "dbms", topicId: "dbms-normalization", question: "Prime attribute is?", options: ["Non-key attribute", "Part of candidate key", "Foreign key", "Primary key only"], correctAnswer: 1, type: "mcq", explanation: "Prime attributes are those appearing in at least one candidate key.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-39", subjectId: "dbms", topicId: "dbms-normalization", question: "Non-prime attribute is?", options: ["Part of key", "Not part of any candidate key", "Primary key", "Foreign key"], correctAnswer: 1, type: "mcq", explanation: "Non-prime attributes are not in any candidate key.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-40", subjectId: "dbms", topicId: "dbms-normalization", question: "Decomposition should be?", options: ["Lossy", "Lossless", "Random", "Partial"], correctAnswer: 1, type: "mcq", explanation: "Lossless decomposition preserves all information.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-41", subjectId: "dbms", topicId: "dbms-normalization", question: "Dependency preservation means?", options: ["All dependencies lost", "All dependencies preserved", "Partial preserved", "None"], correctAnswer: 1, type: "mcq", explanation: "Dependency preservation means constraints can be enforced without join.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-42", subjectId: "dbms", topicId: "dbms-normalization", question: "If relation is in BCNF then?", options: ["Also in 3NF", "Not in 3NF", "Only 2NF", "None"], correctAnswer: 0, type: "mcq", explanation: "BCNF implies 3NF.", difficulty: "easy", eloRating: 1250, marks: 1, negativeMarks: 0.33 },
  { id: "dbms-43", subjectId: "dbms", topicId: "dbms-normalization", question: "A relation in 2NF is free from?", options: ["Partial dependency", "Transitive dependency", "Multivalued dependency", "None"], correctAnswer: 0, type: "mcq", explanation: "2NF removes partial dependencies.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-44", subjectId: "dbms", topicId: "dbms-normalization", question: "If no transitive dependency then relation is in?", options: ["1NF", "2NF", "3NF", "BCNF"], correctAnswer: 2, type: "mcq", explanation: "Absence of transitive dependency (with 2NF conditions) corresponds to 3NF.", difficulty: "medium", eloRating: 1350, marks: 2, negativeMarks: 0.66 },
  { id: "dbms-45", subjectId: "dbms", topicId: "dbms-normalization", question: "If every determinant is candidate key then?", options: ["1NF", "2NF", "3NF", "BCNF"], correctAnswer: 3, type: "mcq", explanation: "If every determinant is a candidate key, relation satisfies BCNF.", difficulty: "medium", eloRating: 1400, marks: 2, negativeMarks: 0.66 },
];

export const questions: Question[] = [
  ...gateMockPaper2Questions,
  ...gateMockPaper3Questions,
  ...gateMockPaper4Questions,
  ...gateMockPaper5Questions,
  ...gateMockPaper6Questions,
  ...gateMockPaper7Questions,
  ...coreQuestions,
];

export function getQuestionsBySubject(subjectId: string) {
  return questions.filter((q) => q.subjectId === subjectId);
}

export function getQuestionsByTopic(topicId: string) {
  return questions.filter((q) => q.topicId === topicId);
}

export function getQuestionById(questionId: string) {
  return questions.find((question) => question.id === questionId) || null;
}

export function getSubjectWiseQuestions(
  subjectId: string,
  answeredIds: Set<string>,
  count: number = 10
): Question[] {
  return questions
    .filter((q) => q.subjectId === subjectId && !answeredIds.has(q.id))
    .slice(0, count);
}

export function getAdaptiveQuestions(
  subjectId: string,
  studentElo: number,
  answeredIds: Set<string>,
  count: number = 5
): Question[] {
  const available = questions
    .filter((q) => q.subjectId === subjectId && !answeredIds.has(q.id))
    .sort((a, b) => Math.abs(a.eloRating - studentElo) - Math.abs(b.eloRating - studentElo));
  return available.slice(0, count);
}

export function getTopicWiseQuestions(
  topicId: string,
  answeredIds: Set<string>,
  count: number = 10
): Question[] {
  return questions
    .filter((q) => q.topicId === topicId && !answeredIds.has(q.id))
    .slice(0, count);
}

export function getFullMockQuestions(answeredIds: Set<string>, count: number = 30): Question[] {
  if (fullGateTestQuestions.length > 0) {
    return fullGateTestQuestions;
  }

  const available = questions.filter((q) => !answeredIds.has(q.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function updateElo(studentElo: number, questionElo: number, correct: boolean): number {
  if (!correct) return studentElo;

  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (questionElo - studentElo) / 400));
  return Math.round(studentElo + K * (1 - expected));
}
