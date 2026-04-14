import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { getSubjectById, getTopicById } from "@/data/subjects";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";

const topicNotesPdfMap: Record<string, string> = {
  "linear-algebra/la-matrices": "/notes/la-matrix.pdf",
  "linear-algebra/la-eigenvalues": "/notes/linear-algebra/la-eigenvalues.pdf",
};

function getTopicNotesPdfPath(subjectId: string, topicId: string) {
  const mappedPath = topicNotesPdfMap[`${subjectId}/${topicId}`];
  if (mappedPath) return mappedPath;
  return `/notes/${subjectId}/${topicId}.pdf`;
}

export default function TopicNotesPage() {
  const { subjectId, topicId } = useParams();

  if (!subjectId || !topicId) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="container py-12 flex-1">
          <h1 className="text-2xl font-bold">Notes not found</h1>
        </div>
        <Footer />
      </div>
    );
  }

  const subject = getSubjectById(subjectId);
  const topic = getTopicById(subjectId, topicId);

  if (!subject || !topic) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="container py-12 flex-1 space-y-4">
          <h1 className="text-2xl font-bold">Topic not found</h1>
          <Link to="/subjects">
            <Button>Back to Subjects</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const pdfPath = getTopicNotesPdfPath(subjectId, topicId);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 bg-[radial-gradient(circle_at_top,_hsl(var(--accent)/0.10),_transparent_38%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))]">
        <div className="container py-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              to={`/subjects/${subjectId}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {subject.name}
            </Link>
            <div className="flex items-center gap-3">
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `hsl(${subject.color} / 0.1)`, color: `hsl(${subject.color})` }}
              >
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{topic.name} Notes</h1>
                <p className="text-muted-foreground">{topic.description}</p>
              </div>
            </div>
          </div>

          <a href={pdfPath} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Open PDF
            </Button>
          </a>
        </div>

        <div className="rounded-[2rem] border border-border/70 bg-card/70 backdrop-blur-sm p-4 md:p-6 shadow-[0_20px_80px_hsl(var(--foreground)/0.08)]">
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/80 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">Revision Notes</p>
              <h2 className="text-lg font-semibold mt-1">{topic.name}</h2>
              <p className="text-sm text-muted-foreground">{subject.name} • PDF viewer</p>
            </div>
            <p className="text-xs text-muted-foreground break-all md:max-w-xs">
              Source: <span className="font-medium text-foreground">{pdfPath}</span>
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[#d8cab7] bg-[#efe5d7] p-3 md:p-5 shadow-inner">
            <div className="mx-auto max-w-5xl rounded-[1.25rem] border border-[#cfbea7] bg-[#f7f1e7] p-3 md:p-5">
              <div className="mx-auto rounded-[1rem] border border-[#2f2a24]/15 bg-white shadow-[0_18px_45px_rgba(58,42,23,0.14)] overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#ece3d6] bg-[#fffaf3] px-4 py-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#9f6840] font-semibold">Study Sheet</p>
                    <p className="text-sm font-semibold text-[#2b221a]">{topic.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#b27a51] font-semibold">GateWay</p>
                    <p className="text-[11px] text-[#7a6b5c]">Notes Viewer</p>
                  </div>
                </div>

                <div className="h-[78vh] min-h-[640px] bg-[#f8f6f1]">
                  <object data={pdfPath} type="application/pdf" className="h-full w-full">
                    <div className="h-full flex items-center justify-center p-8 text-center bg-[#fffdf9]">
                      <div className="max-w-xl space-y-3">
                        <p className="text-lg font-semibold text-[#2b221a]">Notes PDF not available yet</p>
                        <p className="text-sm text-[#6f6458]">
                          Add the PDF at <span className="font-medium text-[#2b221a]">{pdfPath}</span> and it will appear here in this revision-sheet layout.
                        </p>
                        <a href={pdfPath} target="_blank" rel="noopener noreferrer">
                          <Button variant="hero" className="gap-2">
                            <ExternalLink className="h-4 w-4" />
                            Try opening PDF
                          </Button>
                        </a>
                      </div>
                    </div>
                  </object>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
}
