import { useState } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useStudentAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { extractJoinCodeOrLink } from "@/lib/classroom";

interface JoinCourseModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerLabel?: string;
  title?: string;
  description?: string;
  hideTrigger?: boolean;
  onJoined?: () => void;
}

export function JoinCourseModal({
  open,
  onOpenChange,
  triggerLabel = "Join course",
  title = "Join a classroom",
  description = "Paste a classroom course code or a teacher invite link to join from your student dashboard.",
  hideTrigger = false,
  onJoined,
}: JoinCourseModalProps) {
  const { joinCourseByCode } = useStudentAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const [codeOrLink, setCodeOrLink] = useState("");
  const [joining, setJoining] = useState(false);

  const controlledOpen = open ?? internalOpen;
  const setControlledOpen = (nextOpen: boolean) => {
    if (open === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const handleJoin = async () => {
    const normalizedCode = extractJoinCodeOrLink(codeOrLink);

    if (!normalizedCode) {
      toast({
        title: "Enter a course code or link",
        description: "Ask your teacher for a valid course code or invite link and try again.",
        variant: "destructive",
      });
      return;
    }

    setJoining(true);
    try {
      await joinCourseByCode(normalizedCode);
      toast({
        title: "Classroom joined",
        description: "The course has been added to your student dashboard. You can join more courses any time.",
      });
      setCodeOrLink("");
      setControlledOpen(false);
      onJoined?.();
    } catch (error) {
      toast({
        title: "Could not join course",
        description: error instanceof Error ? error.message : "Please try another code.",
        variant: "destructive",
      });
    } finally {
      setJoining(false);
    }
  };

  return (
    <Dialog open={controlledOpen} onOpenChange={setControlledOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="hero" className="gap-2">
            <Users className="h-4 w-4" />
            {triggerLabel}
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="rounded-3xl border-border/70 bg-background/95 shadow-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="text-sm font-medium">Course Code or Invite Link</label>
          <Input
            value={codeOrLink}
            onChange={(event) => setCodeOrLink(event.target.value)}
            placeholder="Paste code like ABCD1234 or a join link"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            You can paste either the raw course code or the invite link your teacher shared. A student can join multiple courses.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setControlledOpen(false)}>
            Cancel
          </Button>
          <Button variant="hero" onClick={() => void handleJoin()} disabled={joining}>
            {joining ? "Joining..." : "Join Course"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
