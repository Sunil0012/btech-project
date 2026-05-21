// This file contains multiple-choice questions related to Database Management Systems (DBMS).

export const dbmsQuestions = [
  {
    id: "dbms-q1",
    subjectId: "database-management-systems",
    topicId: "data-hiding",
    question: "Manager's salary details are hidden from the employee. This is called as?",
    options: [
      "Conceptual level data hiding",
      "Physical level data hiding",
      "External level data hiding",
      "Local level data hiding"
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation: "Physical level data hiding ensures that sensitive data is not visible to unauthorized users.",
    difficulty: "medium",
    eloRating: 1500,
    marks: 1,
    negativeMarks: 0.33
  },
  {
    id: "dbms-q2",
    subjectId: "database-management-systems",
    topicId: "concurrency-control",
    question: "In multiuser database if two users wish to update the same record at the same time, they are prevented from doing so by?",
    options: [
      "Jamming",
      "Password",
      "Documentation",
      "Record lock"
    ],
    correctAnswer: 3,
    type: "mcq",
    explanation: "Record locking is a concurrency control mechanism to prevent conflicts in multiuser databases.",
    difficulty: "medium",
    eloRating: 1550,
    marks: 1,
    negativeMarks: 0.33
  },
  {
    id: "dbms-q3",
    subjectId: "database-management-systems",
    topicId: "transaction-management",
    question: "The problem that occurs when one transaction updates a database item and the transaction fails for some reason is?",
    options: [
      "Temporary Select Problem",
      "Dirty Read Problem",
      "Lost Update Problem",
      "Phantom Read Problem"
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation: "A dirty read occurs when a transaction reads data that has been modified by another transaction that has not yet been committed.",
    difficulty: "medium",
    eloRating: 1600,
    marks: 1,
    negativeMarks: 0.33
  },
  {
    id: "dbms-q4",
    subjectId: "database-management-systems",
    topicId: "user-work-area",
    question: "The User Work Area (UWA) is a set of Program variables declared in the host program to communicate the contents of individual records between?",
    options: [
      "DBMS and the Host record",
      "Host program and the Host record",
      "Host program and DBMS",
      "Host program and Host language"
    ],
    correctAnswer: 2,
    type: "mcq",
    explanation: "The User Work Area (UWA) facilitates communication between the host program and the DBMS.",
    difficulty: "medium",
    eloRating: 1550,
    marks: 1,
    negativeMarks: 0.33
  },
  {
    id: "dbms-q5",
    subjectId: "database-management-systems",
    topicId: "dbms-types",
    question: "Which of the following is not a type of Database Management System?",
    options: [
      "Hierarchical",
      "Network",
      "Relational",
      "Sequential"
    ],
    correctAnswer: 3,
    type: "mcq",
    explanation: "Sequential is not a recognized type of DBMS. Common types include Hierarchical, Network, and Relational.",
    difficulty: "easy",
    eloRating: 1400,
    marks: 1,
    negativeMarks: 0.33
  },
  {
    id: "dbms-q6",
    subjectId: "database-management-systems",
    topicId: "entity-type",
    question: "Which of the following provides the best description of an entity type?",
    options: [
      "A specific concrete object with a defined set of processes (e.g. Jatin with diabetes)",
      "A value given to a particular attribute (e.g. height - 230 cm)",
      "A thing that we wish to collect data about zero or more, possibly real world examples of it may exist",
      "A template for a group of things with the same set of characteristics that may exist in the real world"
    ],
    correctAnswer: 3,
    type: "mcq",
    explanation: "An entity type is a template for a group of things with shared characteristics, used in database design.",
    difficulty: "medium",
    eloRating: 1600,
    marks: 1,
    negativeMarks: 0.33
  },
  {
    id: "dbms-q7",
    subjectId: "database-management-systems",
    topicId: "database-performance",
    question: "A data which improves the performance and accessibility of the database are called:",
    options: [
      "Indexes",
      "User Data",
      "Application Metadata",
      "Data Dictionary"
    ],
    correctAnswer: 0,
    type: "mcq",
    explanation: "Indexes improve database performance by enabling faster data retrieval.",
    difficulty: "easy",
    eloRating: 1400,
    marks: 1,
    negativeMarks: 0.33
  },
  {
    id: "dbms-q8",
    subjectId: "database-management-systems",
    topicId: "database-security",
    question: "Data security threats include?",
    options: [
      "Privacy invasion",
      "Hardware failure",
      "Fraudulent manipulation of data",
      "Encryption and decryption"
    ],
    correctAnswer: 0,
    type: "mcq",
    explanation: "Privacy invasion is a major data security threat that compromises user confidentiality.",
    difficulty: "easy",
    eloRating: 1400,
    marks: 1,
    negativeMarks: 0.33
  },
  {
    id: "dbms-q9",
    subjectId: "database-management-systems",
    topicId: "database-views",
    question: "Which of the following is/are true with reference to 'view' in DBMS?",
    options: [
      "A 'view' is a special stored procedure executed when certain event occurs",
      "A 'view' is a virtual table, which occurs after executing a pre-compiled query",
      "Both (i) and (ii) are true",
      "Neither (i) nor (ii) are true"
    ],
    correctAnswer: 1,
    type: "mcq",
    explanation: "A view is a virtual table created by executing a pre-compiled query, not a stored procedure.",
    difficulty: "medium",
    eloRating: 1550,
    marks: 1,
    negativeMarks: 0.33
  },
  {
    id: "dbms-q10",
    subjectId: "database-management-systems",
    topicId: "specialization",
    question: "Specialization is a __________ process.",
    options: [
      "Top - down",
      "Bottom - up",
      "Both (A) and (B)",
      "None of the above"
    ],
    correctAnswer: 0,
    type: "mcq",
    explanation: "Specialization is a top-down process that divides an entity type into subtypes.",
    difficulty: "medium",
    eloRating: 1550,
    marks: 1,
    negativeMarks: 0.33
  },
  {
    id: "dbms-q11",
    subjectId: "database-management-systems",
    topicId: "inheritance",
    question: "A subclass having more than one super class is called:",
    options: [
      "Category",
      "Classification",
      "Combination",
      "Partial Participation"
    ],
    correctAnswer: 0,
    type: "mcq",
    explanation: "A category is a subclass that has more than one superclass in database design.",
    difficulty: "medium",
    eloRating: 1600,
    marks: 1,
    negativeMarks: 0.33
  },
  {
    id: "dbms-q12",
    subjectId: "database-management-systems",
    topicId: "primary-key",
    question: "A primary key for an entity is:",
    options: [
      "a candidate key",
      "any attribute",
      "a unique attribute",
      "a superkey"
    ],
    correctAnswer: 0,
    type: "mcq",
    explanation: "A primary key is a candidate key that has been chosen to uniquely identify each record.",
    difficulty: "easy",
    eloRating: 1400,
    marks: 1,
    negativeMarks: 0.33
  },
  {
    id: "dbms-q13",
    subjectId: "database-management-systems",
    topicId: "triggers",
    question: "A trigger is:",
    options: [
      "A statement that enables to start",
      "A statement that is executed by the user when debugging an application program",
      "A condition the system tests for the validity of the database user",
      "A statement that is executed automatically by the system as a side effect of modification to the database"
    ],
    correctAnswer: 3,
    type: "mcq",
    explanation: "A trigger is an automatic action executed by the DBMS in response to specific database modifications.",
    difficulty: "medium",
    eloRating: 1550,
    marks: 1,
    negativeMarks: 0.33
  },
  {
    id: "dbms-q14",
    subjectId: "database-management-systems",
    topicId: "aggregation",
    question: "Aggregation is:",
    options: [
      "an abstraction through which relationships are treated as lower level entities",
      "an abstraction through which relationships are treated as higher level entities",
      "an abstraction through which relationships are not treated at all as entities",
      "none of the above"
    ],
    correctAnswer: 0,
    type: "mcq",
    explanation: "Aggregation treats relationships as lower-level entities, allowing them to be part of other relationships.",
    difficulty: "hard",
    eloRating: 1700,
    marks: 1,
    negativeMarks: 0.33
  },
  {
    id: "dbms-q15",
    subjectId: "database-management-systems",
    topicId: "aggregation-association",
    question: "Which of the following statements is correct about aggregation?",
    options: [
      "Aggregation is a strong type of association between two classes with full ownership",
      "Aggregation is a strong type of association between two classes with partial ownership",
      "Aggregation is a weak type of association between two classes with partial ownership",
      "Aggregation is a weak type of association between two classes with full ownership"
    ],
    correctAnswer: 2,
    type: "mcq",
    explanation: "Aggregation is a weak type of association with partial ownership, where objects can exist independently.",
    difficulty: "hard",
    eloRating: 1750,
    marks: 1,
    negativeMarks: 0.33
  },
  {
    id: "dbms-q16",
    subjectId: "database-management-systems",
    topicId: "authorization",
    question: "Which of the following is the process by which a user's privileges ascertained?",
    options: [
      "Authorization",
      "Authentication",
      "Access Control",
      "None of these"
    ],
    correctAnswer: 0,
    type: "mcq",
    explanation: "Authorization is the process of determining what privileges a user has in the database.",
    difficulty: "easy",
    eloRating: 1400,
    marks: 1,
    negativeMarks: 0.33
  }
] as const;

export default dbmsQuestions;
