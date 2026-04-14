import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { BookTemplate, CalendarClock, ClipboardCheck, Paperclip, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { questions as baseQuestions, type Question } from "@/data/questions";
import { subjects } from "@/data/subjects";
import type { CourseSummary } from "@/lib/classroom";
import { pickAssignmentQuestions } from "@/lib/classroom";
import { createAssignmentForCourse } from "@/lib/classroomData";
import {
  serializeAssignmentContent,
  type AssignmentAttachment,
  type AssignmentManualQuestion,
} from "@/lib/assignmentContent";
import {
  readCustomQuestionBank,
  upsertCustomQuestionBankEntries,
  type CustomQuestionBankQuestion,
} from "@/lib/customQuestionBank";
import { generateTemplatedQuestionVariants } from "@/lib/questionTemplates";
import { toast } from "@/hooks/use-toast";

interface AssignmentBuilderProps {
  courses: CourseSummary[];
  defaultCourseId?: string;
  onCreated?: () => void;
}

type AssignmentQuestionSource = "bank" | "manual-quiz";
type ManualDraftQuestionType = "mcq" | "msq" | "nat";

interface ManualQuestionDraft {
  question: string;
  type: ManualDraftQuestionType;
  options: string[];
  correctAnswer: number;
  correctAnswers: number[];
  natMin: string;
  natMax: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  marks: number;
  negativeMarks: number;
}

function createEmptyManualDraft(): ManualQuestionDraft {
  return {
    question: "",
    type: "mcq",
    options: ["", "", "", ""],
    correctAnswer: 0,
    correctAnswers: [0],
    natMin: "",
    natMax: "",
    explanation: "",
    difficulty: "medium",
    marks: 2,
    negativeMarks: 0.66,
  };
}

function createManualQuestionId(subjectId: string, topicId: string) {
  return `manual-${subjectId}-${topicId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getSuggestedQuestionElo(difficulty: Question["difficulty"], marks: number) {
  const base = difficulty === "easy" ? 1225 : difficulty === "medium" ? 1400 : 1575;
  return base + Math.max(0, marks - 1) * 35;
}

function inferAssignmentDifficulty(questionList: AssignmentManualQuestion[]) {
  const uniqueDifficulties = new Set(questionList.map((question) => question.difficulty));
  if (uniqueDifficulties.size === 1) {
    return questionList[0]?.difficulty || "mixed";
  }

  return "mixed";
}

export function AssignmentBuilder({ courses, defaultCourseId, onCreated }: AssignmentBuilderProps) {
  const [attachments, setAttachments] = useState<AssignmentAttachment[]>([]);
  const [customQuestionBank, setCustomQuestionBank] = useState<CustomQuestionBankQuestion[]>([]);
  const [courseId, setCourseId] = useState(defaultCourseId || courses[0]?.id || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"homework" | "test">("homework");
  const [questionSource, setQuestionSource] = useState<AssignmentQuestionSource>("bank");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "");
  const [topicId, setTopicId] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">("mixed");
  const [questionCount, setQuestionCount] = useState(10);
  const [timerMinutes, setTimerMinutes] = useState(30);
  const [dueDate, setDueDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [manualQuestions, setManualQuestions] = useState<AssignmentManualQuestion[]>([]);
  const [manualDraft, setManualDraft] = useState<ManualQuestionDraft>(() => createEmptyManualDraft());
  const [persistManualToBank, setPersistManualToBank] = useState(true);
  const [persistTemplateToBank, setPersistTemplateToBank] = useState(true);
  const [templateSeedId, setTemplateSeedId] = useState("");
  const [templateVariantCount, setTemplateVariantCount] = useState(2);

  const selectedSubject = subjects.find((subject) => subject.id === subjectId);
  const availableTopics = useMemo(() => selectedSubject?.topics || [], [selectedSubject]);
  const combinedQuestionBank = useMemo<Question[]>(
    () => [...baseQuestions, ...customQuestionBank],
    [customQuestionBank]
  );

  useEffect(() => {
    setCustomQuestionBank(readCustomQuestionBank());
  }, []);

  useEffect(() => {
    if (!topicId && availableTopics[0]?.id && questionSource === "manual-quiz") {
      setTopicId(availableTopics[0].id);
    }
  }, [availableTopics, questionSource, topicId]);

  const questionPreview = useMemo(
    () =>
      pickAssignmentQuestions({
        subjectId,
        topicId: topicId || undefined,
        difficulty,
        questionCount,
        questionBank: combinedQuestionBank,
      }),
    [combinedQuestionBank, difficulty, questionCount, subjectId, topicId]
  );

  const templateCandidates = useMemo(
    () =>
      combinedQuestionBank
        .filter((question) => {
          if (question.subjectId !== subjectId) return false;
          if (topicId && question.topicId !== topicId) return false;
          return true;
        })
        .slice()
        .sort((left, right) => left.question.localeCompare(right.question))
        .slice(0, 60),
    [combinedQuestionBank, subjectId, topicId]
  );

  useEffect(() => {
    if (!templateSeedId && templateCandidates[0]?.id) {
      setTemplateSeedId(templateCandidates[0].id);
    }
  }, [templateCandidates, templateSeedId]);

  const handleFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const tooLarge = files.find((file) => file.size > 1_500_000);
    if (tooLarge) {
      toast({
        title: "File too large",
        description: `${tooLarge.name} is larger than 1.5 MB. Keep uploads small for now.`,
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    const nextFiles = await Promise.all(
      files.slice(0, Math.max(0, 3 - attachments.length)).map(
        (file) =>
          new Promise<AssignmentAttachment>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                name: file.name,
                type: file.type || "application/octet-stream",
                size: file.size,
                dataUrl: String(reader.result || ""),
              });
            reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
            reader.readAsDataURL(file);
          })
      )
    );

    setAttachments((previous) => [...previous, ...nextFiles].slice(0, 3));
    event.target.value = "";
  };

  const persistQuestionsToBank = (nextQuestions: AssignmentManualQuestion[], enabled: boolean) => {
    if (!enabled || nextQuestions.length === 0) return;

    const merged = upsertCustomQuestionBankEntries(
      nextQuestions.map((question) => ({
        ...question,
        bankSource: question.templateSourceId ? "teacher-template" : "teacher-manual",
        createdAt: new Date().toISOString(),
      })),
      customQuestionBank
    );
    setCustomQuestionBank(merged);
  };

  const handleAddManualQuestion = () => {
    if (!subjectId || !topicId) {
      toast({
        title: "Choose a topic",
        description: "Manual quiz questions need a subject and topic before they can be added.",
        variant: "destructive",
      });
      return;
    }

    const trimmedQuestion = manualDraft.question.trim();
    const trimmedExplanation = manualDraft.explanation.trim();
    const normalizedOptions = manualDraft.options.map((option) => option.trim()).filter(Boolean);

    if (!trimmedQuestion) {
      toast({
        title: "Question missing",
        description: "Write the question stem before adding it to the quiz.",
        variant: "destructive",
      });
      return;
    }

    if (manualDraft.type !== "nat" && normalizedOptions.length < 2) {
      toast({
        title: "Options missing",
        description: "MCQ and MSQ questions need at least two options.",
        variant: "destructive",
      });
      return;
    }

    if (manualDraft.type === "msq" && manualDraft.correctAnswers.length === 0) {
      toast({
        title: "Correct answers missing",
        description: "Choose at least one correct option for the MSQ question.",
        variant: "destructive",
      });
      return;
    }

    if (manualDraft.type === "nat") {
      const natMin = Number(manualDraft.natMin);
      const natMax = Number(manualDraft.natMax);

      if (!Number.isFinite(natMin) || !Number.isFinite(natMax) || natMax < natMin) {
        toast({
          title: "Numerical range invalid",
          description: "Enter a valid minimum and maximum answer range for this NAT question.",
          variant: "destructive",
        });
        return;
      }
    }

    const nextQuestion: AssignmentManualQuestion = {
      id: createManualQuestionId(subjectId, topicId),
      subjectId,
      topicId,
      question: trimmedQuestion,
      options: manualDraft.type === "nat" ? [] : normalizedOptions,
      correctAnswer:
        manualDraft.type === "nat"
          ? 0
          : Math.min(manualDraft.correctAnswer, Math.max(normalizedOptions.length - 1, 0)),
      correctAnswers:
        manualDraft.type === "msq"
          ? manualDraft.correctAnswers
              .filter((value) => value < normalizedOptions.length)
              .sort((left, right) => left - right)
          : undefined,
      correctNat:
        manualDraft.type === "nat"
          ? {
              min: Number(manualDraft.natMin),
              max: Number(manualDraft.natMax),
            }
          : undefined,
      type: manualDraft.type,
      explanation: trimmedExplanation || "Teacher-authored solution.",
      difficulty: manualDraft.difficulty,
      eloRating: getSuggestedQuestionElo(manualDraft.difficulty, manualDraft.marks),
      marks: manualDraft.marks,
      negativeMarks: manualDraft.type === "mcq" ? manualDraft.negativeMarks : 0,
      source: "manual-quiz",
    };

    setManualQuestions((previous) => [...previous, nextQuestion]);
    persistQuestionsToBank([nextQuestion], persistManualToBank);
    setManualDraft(createEmptyManualDraft());
  };

  const handleGenerateTemplateQuestions = () => {
    const sourceQuestion = templateCandidates.find((question) => question.id === templateSeedId);

    if (!sourceQuestion) {
      toast({
        title: "Template seed missing",
        description: "Pick a source question before generating template variants.",
        variant: "destructive",
      });
      return;
    }

    const generatedQuestions = generateTemplatedQuestionVariants(sourceQuestion, templateVariantCount).map((question) => ({
      ...question,
      id: `${question.id}-${Math.random().toString(36).slice(2, 6)}`,
      source: "manual-quiz" as const,
    }));

    if (generatedQuestions.length === 0) {
      toast({
        title: "No numeric template available",
        description: "This source question does not contain enough numeric content to generate a clean variant automatically.",
        variant: "destructive",
      });
      return;
    }

    setManualQuestions((previous) => [...previous, ...generatedQuestions]);
    persistQuestionsToBank(generatedQuestions, persistTemplateToBank);
    toast({
      title: "Template variants generated",
      description: `${generatedQuestions.length} related question${generatedQuestions.length === 1 ? "" : "s"} added to this quiz.`,
    });
  };

  const handleCreate = async () => {
    if (!courseId || !title.trim() || !subjectId) {
      toast({
        title: "Missing details",
        description: "Choose a course, title, and subject before creating the assignment.",
        variant: "destructive",
      });
      return;
    }

    if (questionSource === "bank" && questionPreview.length === 0) {
      toast({
        title: "No matching questions",
        description: "Adjust the topic, difficulty, or question count before creating this assignment.",
        variant: "destructive",
      });
      return;
    }

    if (questionSource === "manual-quiz" && manualQuestions.length === 0) {
      toast({
        title: "Add quiz questions",
        description: "Create at least one manual or templated question before publishing this quiz.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const finalQuestionIds =
        questionSource === "manual-quiz"
          ? manualQuestions.map((question) => question.id)
          : questionPreview.map((question) => question.id);
      const finalQuestionCount = questionSource === "manual-quiz" ? manualQuestions.length : questionCount;
      const finalDifficulty =
        questionSource === "manual-quiz" ? inferAssignmentDifficulty(manualQuestions) : difficulty;
      const finalTopicId =
        questionSource === "manual-quiz" && new Set(manualQuestions.map((question) => question.topicId)).size !== 1
          ? undefined
          : topicId || undefined;

      await createAssignmentForCourse({
        courseId,
        title: title.trim(),
        description: serializeAssignmentContent({
          body: description,
          attachments,
          manualQuestions: questionSource === "manual-quiz" ? manualQuestions : [],
          questionSource,
        }),
        type,
        subjectId,
        topicId: finalTopicId,
        difficulty: finalDifficulty,
        questionCount: finalQuestionCount,
        timerMinutes,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        questionIds: finalQuestionIds,
      });

      toast({
        title: questionSource === "manual-quiz" ? "Quiz published" : "Assignment created",
        description:
          questionSource === "manual-quiz"
            ? "Students can now attempt the teacher-authored quiz from their dashboard."
            : "Students can now attempt this work from their dashboard.",
      });

      setTitle("");
      setDescription("");
      setTopicId("");
      setQuestionCount(10);
      setTimerMinutes(30);
      setDueDate("");
      setAttachments([]);
      setManualQuestions([]);
      setManualDraft(createEmptyManualDraft());
      onCreated?.();
    } catch (error) {
      toast({
        title: "Could not create assignment",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="rounded-[2rem] border border-border/70 bg-card/90 p-5 shadow-sm">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Assignment Studio</p>
          <h2 className="mt-2 text-2xl font-semibold">Create targeted classwork or a teacher-authored quiz</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Build from the shared bank, write your own questions, and generate numeric template variants that can be reused from your local teacher question bank.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["1. Course", "2. Source", "3. Publish"].map((step) => (
              <span key={step} className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                {step}
              </span>
            ))}
            <span className="rounded-full border border-success/20 bg-success/5 px-3 py-1 text-xs font-medium text-success">
              {customQuestionBank.length} saved custom bank questions
            </span>
          </div>
        </div>
        <div className="hidden rounded-2xl border bg-primary/5 p-3 text-primary md:block">
          <Sparkles className="h-5 w-5" />
        </div>
      </div>

      {courses.length === 0 && (
        <div className="mb-6 rounded-3xl border border-dashed p-5 text-sm text-muted-foreground">
          Create at least one course before publishing assignments to students.
        </div>
      )}

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        {[
          {
            value: "bank",
            title: "Question Bank",
            detail: "Pull from the shared GATE DA bank and your saved custom bank.",
          },
          {
            value: "manual-quiz",
            title: "Manual Quiz",
            detail: "Author teacher questions and attach numeric template variants.",
          },
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            className={`rounded-3xl border p-4 text-left transition-colors ${
              questionSource === item.value
                ? "border-primary bg-primary/5 shadow-sm"
                : "bg-muted/20 hover:bg-muted/35"
            }`}
            onClick={() => setQuestionSource(item.value as AssignmentQuestionSource)}
          >
            <p className="font-semibold text-foreground">{item.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Course</label>
            <select
              className="w-full rounded-2xl border bg-background px-4 py-3 text-sm"
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
            >
              <option value="">Select a course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Assignment title</label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Week 3 probability drill" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Tell students what to focus on and how you want them to approach this work."
              className="min-h-[120px] rounded-2xl"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select
                className="w-full rounded-2xl border bg-background px-4 py-3 text-sm"
                value={type}
                onChange={(event) => setType(event.target.value as "homework" | "test")}
              >
                <option value="homework">Homework</option>
                <option value="test">Test</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Due date</label>
              <Input type="datetime-local" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </div>
          </div>

          <div className="space-y-3 rounded-3xl border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Paperclip className="h-4 w-4 text-primary" />
              Assignment files
            </div>
            <div className="rounded-2xl border border-dashed bg-background/80 p-4">
              <label className="flex cursor-pointer flex-col gap-2 text-sm text-muted-foreground">
                <span>Upload PDFs, images, or notes for students. Maximum 3 files, 1.5 MB each.</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,.ppt,.pptx"
                  className="text-sm"
                  onChange={(event) => void handleFilesSelected(event)}
                />
              </label>
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((file) => (
                  <div key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-2xl border bg-background px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{Math.max(1, Math.round(file.size / 1024))} KB</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setAttachments((previous) => previous.filter((item) => item !== file))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <select
                className="w-full rounded-2xl border bg-background px-4 py-3 text-sm"
                value={subjectId}
                onChange={(event) => {
                  setSubjectId(event.target.value);
                  setTopicId("");
                }}
              >
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Topic</label>
              <select
                className="w-full rounded-2xl border bg-background px-4 py-3 text-sm"
                value={topicId}
                onChange={(event) => setTopicId(event.target.value)}
              >
                <option value="">All topics</option>
                {availableTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {questionSource === "bank" ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Difficulty</label>
                  <select
                    className="w-full rounded-2xl border bg-background px-4 py-3 text-sm"
                    value={difficulty}
                    onChange={(event) => setDifficulty(event.target.value as "easy" | "medium" | "hard" | "mixed")}
                  >
                    <option value="mixed">Mixed</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Questions</label>
                  <select
                    className="w-full rounded-2xl border bg-background px-4 py-3 text-sm"
                    value={questionCount}
                    onChange={(event) => setQuestionCount(Number(event.target.value))}
                  >
                    {[5, 10, 15, 20, 30].map((count) => (
                      <option key={count} value={count}>
                        {count}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Timer</label>
                  <select
                    className="w-full rounded-2xl border bg-background px-4 py-3 text-sm"
                    value={timerMinutes}
                    onChange={(event) => setTimerMinutes(Number(event.target.value))}
                  >
                    {[15, 30, 45, 60, 90, 120, 180].map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} min
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-3xl border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ClipboardCheck className="h-4 w-4 text-primary" />
                  Question bank preview
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Question pool</p>
                    <p className="mt-1 text-lg font-semibold">{questionPreview.length} questions selected</p>
                  </div>
                  <div className="rounded-2xl border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Saved teacher bank</p>
                    <p className="mt-1 text-lg font-semibold">{customQuestionBank.length} reusable questions</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {questionPreview.slice(0, 4).map((question) => (
                    <div key={question.id} className="rounded-2xl border bg-background px-3 py-3 text-sm">
                      <p className="font-medium text-foreground">{question.question}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {question.difficulty} • ELO {question.eloRating}
                      </p>
                    </div>
                  ))}
                  {questionPreview.length === 0 && (
                    <div className="rounded-2xl border border-dashed bg-background px-3 py-6 text-sm text-muted-foreground">
                      No matching bank questions yet. Change the scope or switch to manual quiz mode.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Draft difficulty</label>
                  <select
                    className="w-full rounded-2xl border bg-background px-4 py-3 text-sm"
                    value={manualDraft.difficulty}
                    onChange={(event) =>
                      setManualDraft((previous) => ({
                        ...previous,
                        difficulty: event.target.value as ManualQuestionDraft["difficulty"],
                      }))
                    }
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Timer</label>
                  <select
                    className="w-full rounded-2xl border bg-background px-4 py-3 text-sm"
                    value={timerMinutes}
                    onChange={(event) => setTimerMinutes(Number(event.target.value))}
                  >
                    {[10, 15, 20, 30, 45, 60, 90].map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} min
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-3xl border bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Plus className="h-4 w-4 text-primary" />
                      Manual question builder
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Write your own question and optionally save it into the local teacher question bank.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={persistManualToBank}
                      onChange={(event) => setPersistManualToBank(event.target.checked)}
                    />
                    Save to bank
                  </label>
                </div>

                <div className="mt-4 space-y-3">
                  <Textarea
                    value={manualDraft.question}
                    onChange={(event) => setManualDraft((previous) => ({ ...previous, question: event.target.value }))}
                    className="min-h-[96px] rounded-2xl"
                    placeholder="Write the question exactly how students should see it."
                  />

                  <div className="grid gap-3 md:grid-cols-4">
                    <select
                      className="rounded-2xl border bg-background px-4 py-3 text-sm"
                      value={manualDraft.type}
                      onChange={(event) =>
                        setManualDraft((previous) => ({
                          ...previous,
                          type: event.target.value as ManualDraftQuestionType,
                        }))
                      }
                    >
                      <option value="mcq">MCQ</option>
                      <option value="msq">MSQ</option>
                      <option value="nat">NAT</option>
                    </select>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={manualDraft.marks}
                      onChange={(event) =>
                        setManualDraft((previous) => ({ ...previous, marks: Number(event.target.value) || 1 }))
                      }
                      placeholder="Marks"
                    />
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={manualDraft.negativeMarks}
                      disabled={manualDraft.type !== "mcq"}
                      onChange={(event) =>
                        setManualDraft((previous) => ({
                          ...previous,
                          negativeMarks: Number(event.target.value) || 0,
                        }))
                      }
                      placeholder="Negative"
                    />
                    <div className="rounded-2xl border bg-background px-4 py-3 text-sm text-muted-foreground">
                      Suggested ELO {getSuggestedQuestionElo(manualDraft.difficulty, manualDraft.marks)}
                    </div>
                  </div>

                  {manualDraft.type === "nat" ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        value={manualDraft.natMin}
                        onChange={(event) => setManualDraft((previous) => ({ ...previous, natMin: event.target.value }))}
                        placeholder="Accepted minimum value"
                      />
                      <Input
                        value={manualDraft.natMax}
                        onChange={(event) => setManualDraft((previous) => ({ ...previous, natMax: event.target.value }))}
                        placeholder="Accepted maximum value"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {manualDraft.options.map((option, index) => {
                        const isCorrect =
                          manualDraft.type === "msq"
                            ? manualDraft.correctAnswers.includes(index)
                            : manualDraft.correctAnswer === index;

                        return (
                          <div key={`manual-option-${index}`} className="flex items-center gap-3 rounded-2xl border bg-background px-4 py-3">
                            <button
                              type="button"
                              className={`h-6 w-6 rounded-full border text-xs font-semibold ${
                                isCorrect ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
                              }`}
                              onClick={() => {
                                if (manualDraft.type === "msq") {
                                  setManualDraft((previous) => ({
                                    ...previous,
                                    correctAnswers: previous.correctAnswers.includes(index)
                                      ? previous.correctAnswers.filter((value) => value !== index)
                                      : [...previous.correctAnswers, index].sort((left, right) => left - right),
                                  }));
                                  return;
                                }

                                setManualDraft((previous) => ({ ...previous, correctAnswer: index }));
                              }}
                            >
                              {isCorrect ? "OK" : index + 1}
                            </button>
                            <Input
                              value={option}
                              onChange={(event) =>
                                setManualDraft((previous) => {
                                  const next = [...previous.options];
                                  next[index] = event.target.value;
                                  return { ...previous, options: next };
                                })
                              }
                              placeholder={`Option ${index + 1}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <Textarea
                    value={manualDraft.explanation}
                    onChange={(event) => setManualDraft((previous) => ({ ...previous, explanation: event.target.value }))}
                    className="min-h-[88px] rounded-2xl"
                    placeholder="Add a short explanation or model solution."
                  />

                  <Button variant="outline" className="w-full gap-2" type="button" onClick={handleAddManualQuestion}>
                    <Plus className="h-4 w-4" />
                    Add question to quiz
                  </Button>
                </div>
              </div>

              <div className="rounded-3xl border bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <BookTemplate className="h-4 w-4 text-primary" />
                      Templatize from bank
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Generate numeric variants from an existing bank question for fresh practice with the same concept.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={persistTemplateToBank}
                      onChange={(event) => setPersistTemplateToBank(event.target.checked)}
                    />
                    Save to bank
                  </label>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_150px]">
                  <select
                    className="rounded-2xl border bg-background px-4 py-3 text-sm"
                    value={templateSeedId}
                    onChange={(event) => setTemplateSeedId(event.target.value)}
                  >
                    <option value="">Select a source question</option>
                    {templateCandidates.map((question) => (
                      <option key={question.id} value={question.id}>
                        {question.question.slice(0, 92)}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-2xl border bg-background px-4 py-3 text-sm"
                    value={templateVariantCount}
                    onChange={(event) => setTemplateVariantCount(Number(event.target.value))}
                  >
                    {[1, 2, 3].map((count) => (
                      <option key={count} value={count}>
                        {count} variant{count === 1 ? "" : "s"}
                      </option>
                    ))}
                  </select>
                </div>
                <Button variant="outline" className="mt-3 w-full gap-2" type="button" onClick={handleGenerateTemplateQuestions}>
                  <Wand2 className="h-4 w-4" />
                  Generate template questions
                </Button>
              </div>

              <div className="rounded-3xl border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ClipboardCheck className="h-4 w-4 text-primary" />
                  Manual quiz preview
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Questions ready</p>
                    <p className="mt-1 text-lg font-semibold">{manualQuestions.length}</p>
                  </div>
                  <div className="rounded-2xl border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Timer</p>
                    <p className="mt-1 flex items-center gap-2 text-lg font-semibold">
                      <CalendarClock className="h-4 w-4 text-accent" />
                      {timerMinutes} minutes
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {manualQuestions.slice(0, 6).map((question) => (
                    <div key={question.id} className="flex items-start justify-between gap-3 rounded-2xl border bg-background px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-foreground">{question.question}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {question.type.toUpperCase()} • {question.difficulty} • ELO {question.eloRating}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setManualQuestions((previous) => previous.filter((item) => item.id !== question.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {manualQuestions.length === 0 && (
                    <div className="rounded-2xl border border-dashed bg-background px-3 py-6 text-sm text-muted-foreground">
                      Add manual or templated questions and they will appear here as the published quiz.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Button variant="hero" className="w-full gap-2" onClick={() => void handleCreate()} disabled={creating || courses.length === 0}>
            {creating ? "Creating..." : questionSource === "manual-quiz" ? "Publish quiz" : "Create assignment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
