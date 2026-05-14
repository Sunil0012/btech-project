import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Search, BookOpen } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center space-y-8" style={{ animation: "fade-up 0.7s cubic-bezier(0.16,1,0.3,1) forwards" }}>
          {/* Animated 404 badge */}
          <div className="relative mx-auto w-fit">
            <div className="text-[8rem] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-primary via-accent to-primary/60 select-none">
              404
            </div>
            <div className="absolute inset-0 text-[8rem] font-black leading-none tracking-tighter text-primary/5 blur-2xl select-none">
              404
            </div>
          </div>

          {/* Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/5">
            <Search className="h-7 w-7 text-primary" />
          </div>

          {/* Message */}
          <div className="space-y-3">
            <h1 className="text-2xl font-bold md:text-3xl">Page not found</h1>
            <p className="mx-auto max-w-md text-muted-foreground leading-relaxed">
              The page <code className="rounded-lg bg-muted px-2 py-1 text-xs font-mono text-foreground">{location.pathname}</code> doesn't exist or may have been moved.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/">
              <Button variant="hero" size="lg" className="gap-2">
                <Home className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="outline" size="lg" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link to="/practice">
              <Button variant="outline" size="lg" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Practice
              </Button>
            </Link>
          </div>

          {/* Decorative tip */}
          <div className="rounded-2xl border bg-card/80 p-4 text-sm text-muted-foreground">
            <p>Looking for something specific? Try the <Link to="/subjects" className="text-primary font-medium hover:underline">Subjects</Link> page or <Link to="/ai-coach" className="text-primary font-medium hover:underline">Study Coach</Link> for help.</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default NotFound;
