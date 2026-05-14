import { Link } from "react-router-dom";
import { GraduationCap, Github, Twitter, Linkedin, Mail, Heart, ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card/30 backdrop-blur-sm">
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link to="/" className="flex items-center gap-2.5 font-bold text-lg group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="tracking-tight">GateWay</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              GATE Data Science & AI preparation platform with adaptive learning, ELO-based recommendations, and AI study coaching.
            </p>
            <div className="flex gap-2">
              {[
                { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
                { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
                { icon: Github, href: "https://github.com", label: "GitHub" },
                { icon: Mail, href: "mailto:support@gatedaprep.com", label: "Email" },
              ].map(({ icon: Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="h-9 w-9 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 hover:shadow-sm transition-all duration-200">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm tracking-wide">Platform</h4>
            <div className="space-y-2.5">
              {[
                { to: "/subjects", label: "Subjects" },
                { to: "/practice", label: "Practice" },
                { to: "/dashboard", label: "Dashboard" },
                { to: "/insights", label: "Insights" },
                { to: "/ai-coach", label: "Study Coach" },
                { to: "/settings", label: "Settings" },
              ].map((link) => (
                <Link key={link.to} to={link.to} className="block text-sm text-muted-foreground hover:text-primary transition-colors duration-200">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm tracking-wide">Resources</h4>
            <div className="space-y-2.5">
              {[
                { label: "GATE DA Syllabus", href: "https://gate2025.iitr.ac.in/da.php" },
                { label: "Previous Year Papers", href: "https://gate.iitk.ac.in/previous_papers" },
                { label: "Study Materials", href: "#" },
                { label: "FAQ", href: "#" },
              ].map((item) => (
                <a key={item.label} href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors duration-200">
                  {item.label}
                  {item.href.startsWith("http") && <ExternalLink className="h-3 w-3 opacity-50" />}
                </a>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm tracking-wide">Legal</h4>
            <div className="space-y-2.5">
              {[
                { label: "Privacy Policy", to: "#" },
                { label: "Terms of Service", to: "#" },
                { label: "Cookie Policy", to: "#" },
                { label: "Contact Us", to: "mailto:support@gatedaprep.com" },
              ].map((item) => (
                <a key={item.label} href={item.to}
                  className="block text-sm text-muted-foreground hover:text-primary transition-colors duration-200 cursor-pointer">
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border/60 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} GateWay. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            Made with <Heart className="h-3 w-3 text-destructive animate-pulse" /> for GATE aspirants
          </p>
          <p className="font-mono text-[11px] bg-muted/50 px-2 py-1 rounded-md">v1.0.0</p>
        </div>
      </div>
    </footer>
  );
}
