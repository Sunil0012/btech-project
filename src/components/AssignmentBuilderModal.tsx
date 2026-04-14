import { useState } from "react";
import { ClipboardList, Sparkles } from "lucide-react";
import { AssignmentBuilder } from "@/components/AssignmentBuilder";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { CourseSummary } from "@/lib/classroom";

interface AssignmentBuilderModalProps {
  courses: CourseSummary[];
  onCreated?: () => void;
}

export function AssignmentBuilderModal({ courses, onCreated }: AssignmentBuilderModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero" className="gap-2">
          <ClipboardList className="h-4 w-4" />
          Create Assignment
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto rounded-[2rem] border-border/70 p-0">
        <DialogHeader className="border-b border-border/60 px-6 py-5">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Assignment Builder
          </div>
          <DialogTitle className="pt-3 text-2xl">Create homework or a practice test</DialogTitle>
          <DialogDescription>
            Configure the course, focus area, difficulty, timing, and question count, then publish it directly to students.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5">
          <AssignmentBuilder
            courses={courses}
            onCreated={() => {
              setOpen(false);
              onCreated?.();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
