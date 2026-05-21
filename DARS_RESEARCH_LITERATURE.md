# DARS Literature Foundation

This note gives a paper-ready literature map for DARS: Dynamic Adaptive Rating System for graph-guided GATE preparation. It is organized around the exact claims your dataset supports: dynamic rating, temporal student modeling, graph-based routing, remediation, prediction, and responsible dataset reporting.

## 1. Psychometric and Rating Foundations

DARS is closest to a hybrid of educational measurement and online skill rating. Classical item-response theory (IRT) and the Rasch model establish the core idea that correctness is a function of learner ability and item difficulty. This supports DARS fields such as `DARS_rating_before`, `DARS_rating_after`, `difficulty_label`, and question-level calibration.

Key references:

- Rasch, G. (1960). *Probabilistic Models for Some Intelligence and Attainment Tests*. Foundation for one-parameter ability-difficulty modeling. Background: https://www.publichealth.columbia.edu/research/population-health-methods/rasch-modeling
- Elo, A. E. (1978). *The Rating of Chessplayers, Past and Present*. Foundation for iterative rating updates and expected-outcome scoring. Reference copy: https://gwern.net/doc/statistics/order/comparison/1978-elo-theratingofchessplayerspastandpresent.pdf
- Glickman, M. E. (1995/1999). Glicko extends Elo by modeling uncertainty/reliability in ratings, which is directly relevant to DARS volatility and dynamic K-factor. Official notes: https://www.glicko.net/glicko.html
- Herbrich, R., Minka, T., & Graepel, T. (2007). TrueSkill generalizes Elo through Bayesian skill estimates and uncertainty tracking. Useful for positioning DARS as an education-specific dynamic rating system. https://www.microsoft.com/en-us/research/publication/trueskilltm-a-bayesian-skill-rating-system/
- Wainer, H. et al. (2000). *Computerized Adaptive Testing: A Primer*. Supports adaptive question selection based on evolving learner ability. Publisher page: https://www.routledge.com/9781135660826

How DARS extends this line: it keeps the interpretable expected-success idea from IRT/Elo, but adds educational signals that standard rating systems do not use: response time, rapid-guess penalties, streak, graph centrality, remediation, and topic weakness.

## 2. Knowledge Tracing and Temporal Learner Modeling

Knowledge tracing research formalizes the idea that student knowledge changes over interaction sequences. This justifies the DARS interaction log as the primary dataset, because the most important unit is not a static score but a time-ordered response event.

Key references:

- Corbett, A. T., & Anderson, J. R. (1995). "Knowledge Tracing: Modeling the Acquisition of Procedural Knowledge." Foundational Bayesian Knowledge Tracing paper. DOI listed by DBLP: https://dblp.org/rec/journals/umuai/CorbettA95.html
- Piech, C. et al. (2015). "Deep Knowledge Tracing." Shows that temporal sequences of student interactions can predict future performance and reveal curriculum structure. NeurIPS page: https://papers.neurips.cc/paper/5654-deep-knowledge-tracing
- Wilson, K. H. et al. (2016). "How Deep is Knowledge Tracing?" Important critical comparison showing that simpler knowledge tracing baselines can remain competitive when well-specified. https://arxiv.org/abs/1604.02416
- ASSISTments 2009-2010 dataset. Standard educational interaction dataset with fields such as user, problem, correctness, response time, and support-seeking behavior. Documentation: https://edudata.readthedocs.io/en/latest/build/blitz/ASSISTments/ASSISTments2009-2010.html
- Choi, Y. et al. (2020). "EdNet: A Large-Scale Hierarchical Dataset in Education." Large-scale benchmark for student interaction sequences. https://arxiv.org/abs/1912.03072

How DARS extends this line: instead of only predicting correctness from past responses, DARS also updates an interpretable rating, classifies momentum, triggers remediation, and logs graph-route provenance for each recommendation.

## 3. Graph-Based Recommendation and Learning Paths

DARS uses a question knowledge graph where each question is a node and edges encode same-topic, prerequisite, and cross-domain relationships. This aligns with research on knowledge graph recommender systems and personalized learning paths.

Key references:

- Guo, Q. et al. (2020). "A Survey on Knowledge Graph-Based Recommender Systems." Broad grounding for graph-enhanced recommendation. https://arxiv.org/abs/2003.00911
- Tarus, J. K. et al. / later surveys on educational knowledge graphs show how graph structure supports resource recommendation, path explainability, and learner personalization. Education KG survey: https://www.mdpi.com/2079-9292/13/13/2537
- "Path-Based Recommender System for Learning Activities Using Knowledge Graphs" presents path-aware recommendation for e-learning resources. https://www.mdpi.com/2078-2489/14/1/9
- "Personalized Learning Path Recommendation Based on Knowledge Graphs: A Survey" summarizes recent work on learner feature mining, learning path generation, and explainability. https://www.mdpi.com/2079-9292/15/1/238

How DARS extends this line: it records the actual graph hop distance and recommendation source for each student response, enabling empirical analysis of whether graph-route recommendations outperform fallback routing.

## 4. Learning Analytics, Prediction, and Intervention

The student performance snapshot dataset supports risk scoring, teacher intervention, and readiness prediction. This sits within learning analytics and educational data mining, where the goal is not only prediction but actionable support.

Key references:

- Siemens, G., & Baker, R. S. J. d. (2012). "Learning Analytics and Educational Data Mining: Towards Communication and Collaboration." Positions EDM and learning analytics as complementary methods for data-driven education. https://learninganalytics.upenn.edu/ryanbaker/BakerSiemensHandbook2013.pdf
- Bloom, B. S. (1984). "The 2 Sigma Problem." Motivation for adaptive tutoring systems that approximate the benefits of individualized instruction. https://gwern.net/doc/psychology/1984-bloom.pdf
- Baker, R. S., & Yacef, K. (2009). "The State of Educational Data Mining in 2009." Useful background for EDM methodology and student-modeling tasks. https://educationaldatamining.org/EDM2009/uploads/proceedings/baker.pdf

How DARS extends this line: the snapshot dataset is intentionally compact and teacher-facing, combining accuracy, consistency, volatility, completion, weak topics, and predicted score into intervention-ready evidence.

## 5. Dataset Reporting and Research Quality

Because this is intended for an industry-level submission, dataset documentation matters. The paper should clearly separate simulated pilot data from real GATEWay logs, describe generation assumptions, and document privacy constraints.

Key references:

- Gebru, T. et al. (2018). "Datasheets for Datasets." Use this as a template for documenting motivation, composition, collection/generation, preprocessing, intended use, and limitations. https://arxiv.org/abs/1803.09010
- Mitchell, M. et al. (2019). "Model Cards for Model Reporting." Useful if you report DARS prediction/risk models and want transparent intended-use and performance reporting. https://arxiv.org/abs/1810.03993

Recommended paper framing:

- Pilot dataset: 20 simulated FTE455 students, 5,000 interactions, 2,143 graph edges.
- Primary contribution: the connected schema and DARS logging pipeline, not only the simulated values.
- Final evaluation target: replace or augment simulated rows with real GATEWay data from 50-100 students and 5k-20k interactions.
- Ethics: anonymize real users, avoid exposing passwords in research artifacts, report that prediction scores are assistive signals and not final judgments.

## Suggested Related Work Paragraph

Adaptive educational systems have historically drawn from psychometric models such as Rasch/IRT and computerized adaptive testing, where learner ability and item difficulty determine item selection. Online rating systems such as Elo, Glicko, and TrueSkill add sequential skill updates and uncertainty-aware rating behavior. In parallel, knowledge tracing models, from Bayesian Knowledge Tracing to Deep Knowledge Tracing, model student learning as a temporal interaction sequence. Recent work on knowledge graph recommender systems and personalized learning paths further shows that graph structure can improve explainability and sequencing of learning resources. DARS combines these threads by maintaining an interpretable dynamic rating, incorporating response time, rapid-guess penalties, streak, and volatility, and routing questions through a weighted knowledge graph with explicit remediation paths.

## Suggested Contribution Statement

The proposed DARS dataset contributes a connected, event-level schema for adaptive exam preparation: a temporal student interaction table, a weighted question knowledge graph, and a student performance snapshot table. Unlike static score datasets, the schema records pre/post rating, momentum state, graph hop distance, remediation flags, and recommendation provenance at every response. This enables evaluation of dynamic K-factor behavior, momentum modeling, graph-guided routing, remediation effectiveness, and teacher-facing risk prediction within one coherent dataset.
