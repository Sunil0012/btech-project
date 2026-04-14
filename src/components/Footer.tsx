import { Link } from "react-router-dom";
import { GraduationCap, Github, Twitter, Linkedin, Mail, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-card/50">
      <div className="container py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <Link to="/" className="flex items-center gap-2 font-bold text-lg">
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              GateWay
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              GATE Data Science and Artificial Intelligence preparation platform with adaptive learning and guided practice.
            </p>
            <div className="flex gap-2">
              {[
                { icon: Twitter, href: "#" },
                { icon: Linkedin, href: "#" },
                { icon: Github, href: "#" },
                { icon: Mail, href: "mailto:support@gatedaprep.com" },
              ].map(({ icon: Icon, href }, i) => (
                <a key={i} href={href} target="_blank" rel="noopener noreferrer"
                  className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Platform</h4>
            <div className="space-y-2">
              {[
                { to: "/subjects", label: "Subjects" },
                { to: "/practice", label: "Practice" },
                { to: "/dashboard", label: "Dashboard" },
                { to: "/settings", label: "Settings" },
              ].map((link) => (
                <Link key={link.to} to={link.to} className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Resources</h4>
            <div className="space-y-2">
              {["GATE Syllabus", "Study Plan", "Previous Year Papers", "FAQ"].map((item) => (
                <span key={item} className="block text-sm text-muted-foreground cursor-default">{item}</span>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Legal</h4>
            <div className="space-y-2">
              {["Privacy Policy", "Terms of Service", "Cookie Policy", "Contact Us"].map((item) => (
                <span key={item} className="block text-sm text-muted-foreground cursor-default">{item}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t mt-6 pt-5 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} GateWay. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="h-3 w-3 text-destructive" /> for GATE aspirants
          </p>
          <p>v1.0.0</p>
        </div>
      </div>
    </footer>
  );
}
