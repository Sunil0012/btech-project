import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ScrollReveal } from "@/components/ScrollReveal";
import { visibleSubjects, getSubjectById } from "@/data/subjects";
import { getQuestionsBySubject } from "@/data/questions";
import { useStudentAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Play,
  FileText,
  Video,
  AlertTriangle,
  Target,
  Brain,
} from "lucide-react";

export default function SubjectsPage() {
  const { subjectId } = useParams();
  if (subjectId) return <SubjectDetail subjectId={subjectId} />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="container py-12 flex-1">
        <ScrollReveal>
          <h1 className="text-2xl font-bold mb-2">All Subjects</h1>
          <p className="text-muted-foreground mb-8">Choose a subject to study and practice.</p>
        </ScrollReveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleSubjects.map((subject, index) => (
            <ScrollReveal key={subject.id} delay={index * 60}>
              <Link to={`/subjects/${subject.id}`} className="block group">
                <div className="bg-card border rounded-xl p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 active:scale-[0.98]">
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `hsl(${subject.color} / 0.1)`, color: `hsl(${subject.color})` }}
                  >
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{subject.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{subject.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {subject.topics.length} topics • {getQuestionsBySubject(subject.id).length} questions
                  </p>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}

function SubjectDetail({ subjectId }: { subjectId: string }) {
  const subject = getSubjectById(subjectId);
  const { subjectScores } = useStudentAuth();

  if (!subject) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="container py-12 text-center flex-1">
          <h1 className="text-2xl font-bold">Subject not found</h1>
          <Link to="/subjects">
            <Button className="mt-4">Back to Subjects</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const score = subjectScores[subjectId];
  const accuracy = score ? Math.round((score.correct / score.total) * 100) : null;
  const isWeak = accuracy !== null && accuracy < 60;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="container py-12 flex-1">
        <ScrollReveal>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `hsl(${subject.color} / 0.1)`, color: `hsl(${subject.color})` }}
            >
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{subject.name}</h1>
              <p className="text-muted-foreground">{subject.description}</p>
            </div>
          </div>
        </ScrollReveal>

        {isWeak && (
          <ScrollReveal delay={100}>
            <div className="mt-6 bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">You're scoring {accuracy}% in this subject</p>
                <p className="text-sm text-muted-foreground">Focus on the topics below and open the notes PDF for revision.</p>
              </div>
            </div>
          </ScrollReveal>
        )}

        {score && (
          <ScrollReveal delay={150}>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-card border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold">{score.total}</p>
                <p className="text-xs text-muted-foreground">Attempted</p>
              </div>
              <div className="bg-card border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-success">{score.correct}</p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <div className="bg-card border rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${isWeak ? "text-destructive" : "text-success"}`}>{accuracy}%</p>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
            </div>
          </ScrollReveal>
        )}

        <ScrollReveal delay={200}>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link to={`/practice?mode=topic-wise&subject=${subjectId}`} className="block">
              <div className="bg-card border rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                  <Target className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-semibold text-sm">Topic-wise Test</h3>
                <p className="text-xs text-muted-foreground mt-1">Practice specific topics</p>
              </div>
            </Link>

            <Link to={`/practice?mode=adaptive&subject=${subjectId}`} className="block">
              <div className="bg-card border rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">Adaptive Practice</h3>
                <p className="text-xs text-muted-foreground mt-1">AI adjusts difficulty</p>
              </div>
            </Link>
          </div>
        </ScrollReveal>

        <div className="mt-10 space-y-6">
          <h2 className="text-xl font-semibold">Topics</h2>
          {subject.topics.map((topic, index) => (
            <ScrollReveal key={topic.id} delay={index * 60}>
              <TopicCard
                topic={topic}
                subjectId={subjectId}
                subjectColor={subject.color}
              />
            </ScrollReveal>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}

function TopicCard({
  topic,
  subjectId,
  subjectColor,
}: {
  topic: {
    id: string;
    name: string;
    description: string;
    notes: string[];
    youtubeVideos: { title: string; url: string; channel: string }[];
  };
  subjectId: string;
  subjectColor: string;
}) {
  const [activeVideo, setActiveVideo] = useState(() => {
    const firstPlayable = topic.youtubeVideos.findIndex((video) => isPlayableYoutubeUrl(video.url));
    return firstPlayable >= 0 ? firstPlayable : -1;
  });

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: `hsl(${subjectColor} / 0.1)`, color: `hsl(${subjectColor})` }}
            >
              <BookOpen className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">{topic.name}</h3>
              <p className="text-xs text-muted-foreground leading-tight">{topic.description}</p>
            </div>
          </div>

          <Link to={`/practice?mode=topic-wise&subject=${subjectId}&topic=${topic.id}`}>
            <Button size="sm" variant="hero" className="gap-1 shrink-0 h-8 px-3 text-xs">
              <Play className="h-3 w-3" /> Practice
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          <Link
            to={`/subjects/${subjectId}/${topic.id}/notes`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            Notes
          </Link>
        </div>
      </div>

      <div className="border-t px-4 pt-3 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <Video className="h-4.5 w-4.5 text-destructive" />
          <h4 className="font-semibold text-xs uppercase tracking-wide">Recommended Videos</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-1.5">
          {topic.youtubeVideos.map((video, index) => {
            const selected = index === activeVideo;
            const playable = isPlayableYoutubeUrl(video.url);
            const embedUrl = playable ? getYoutubeEmbedUrl(video.url) : null;
            return (
              <button
                key={`${video.title}-${index}`}
                type="button"
                onClick={() => setActiveVideo(selected ? -1 : index)}
                className={`group relative aspect-square w-full text-left rounded-xl border p-2 transition-all overflow-hidden shadow-sm ${
                  selected
                    ? "border-primary/70 bg-gradient-to-br from-primary/10 via-card to-card ring-1 ring-primary/20"
                    : "border-border bg-gradient-to-br from-card to-muted/30 hover:border-primary/30 hover:shadow-md"
                }`}
              >
                <div className="flex h-full flex-col gap-2">
                  <div className="flex items-center justify-between gap-2 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                    <span>{video.channel}</span>
                    <span>{selected ? "Open" : "Tap"}</span>
                  </div>

                  <div className="relative min-h-0 flex-[1.2] rounded-lg border border-white/10 bg-black/90 overflow-hidden">
                    {selected ? (
                      playable ? (
                        <iframe
                          src={embedUrl ?? undefined}
                          title={video.title}
                          className="h-full w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center p-2 text-center bg-gradient-to-br from-muted/20 to-background">
                          <AlertTriangle className="h-4 w-4 text-warning mb-1" />
                          <p className="text-[10px] font-medium leading-tight">Replace this link</p>
                          <p className="mt-1 text-[8px] text-muted-foreground leading-tight">
                            Replace this sample URL with a real YouTube link.
                          </p>
                        </div>
                      )
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 shadow-lg transition-transform group-hover:scale-105">
                          <Play className="h-4 w-4 text-white" />
                        </div>
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2">
                          <p className="text-[10px] font-semibold leading-tight text-white line-clamp-2">
                            {video.title}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getYoutubeVideoId(url: string) {
  if (url.includes("youtube.com/embed/")) {
    const match = url.match(/youtube\.com\/embed\/([^?&]+)/);
    return match?.[1] ?? null;
  }

  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch?.[1]) return watchMatch[1];

  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch?.[1]) return shortMatch[1];

  return null;
}

function getYoutubeEmbedUrl(url: string) {
  const videoId = getYoutubeVideoId(url);
  if (!videoId) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
}

function isPlayableYoutubeUrl(url: string) {
  const videoId = getYoutubeVideoId(url);
  return Boolean(videoId) && !/example\d+/i.test(url);
}
