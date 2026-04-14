import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useStudentAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { studentSupabase } from "@/integrations/supabase/student-client";
import { toast } from "@/hooks/use-toast";
import {
  User, Palette, Target, Lock, Bell, Moon, Sun, Monitor, Save, CheckCircle2,
  Copy,
} from "lucide-react";

export default function SettingsPage() {
  const { user } = useStudentAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("profile");
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [studyGoal, setStudyGoal] = useState("crack_gate");
  const [saving, setSaving] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await studentSupabase.auth.updateUser({
        data: { full_name: fullName },
      });
      if (error) throw error;

      await studentSupabase
        .from("profiles")
        .update({ full_name: fullName, study_goal: studyGoal, updated_at: new Date().toISOString() })
        .eq("user_id", user?.id);

      toast({ title: "Profile updated", description: "Your changes have been saved." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await studentSupabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password updated!" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyStudentId = async () => {
    if (!user?.id) return;

    try {
      await navigator.clipboard.writeText(user.id);
      toast({
        title: "Student ID copied",
        description: "Paste this into the analytics notebook when you want this student's report.",
      });
    } catch (err: any) {
      toast({
        title: "Could not copy Student ID",
        description: err?.message || "Please copy it manually.",
        variant: "destructive",
      });
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "goals", label: "Study Goals", icon: Target },
    { id: "security", label: "Security", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="container py-8 flex-1">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground mb-8">Manage your account and preferences.</p>

        <div className="grid lg:grid-cols-[240px_1fr] gap-6\">
          {/* Sidebar */}
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="bg-card border rounded-xl p-6">
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Profile Settings</h2>
                  <p className="text-sm text-muted-foreground">Update your personal information.</p>
                </div>

                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Student ID</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={user?.id || ""}
                        disabled
                        className="w-full rounded-xl border bg-muted px-4 py-2.5 text-sm font-mono cursor-not-allowed"
                      />
                      <Button variant="outline" type="button" className="gap-2 shrink-0" onClick={() => void handleCopyStudentId()} disabled={!user?.id}>
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This is your unique student identifier for notebooks, analytics, and teacher-side tracking.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <input
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="w-full rounded-xl border bg-muted px-4 py-2.5 text-sm cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <Button variant="hero" onClick={handleSaveProfile} disabled={saving} className="gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Appearance</h2>
                  <p className="text-sm text-muted-foreground">Choose your preferred theme.</p>
                </div>

                <div className="grid grid-cols-3 gap-4 max-w-lg">
                  {[
                    { id: "light" as const, label: "Light", icon: Sun, desc: "Clean & bright" },
                    { id: "dark" as const, label: "Dark", icon: Moon, desc: "Easy on eyes" },
                    { id: "system" as const, label: "System", icon: Monitor, desc: "Match device" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`relative p-4 rounded-xl border-2 text-center space-y-2 transition-all ${
                        theme === t.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      {theme === t.id && (
                        <CheckCircle2 className="h-4 w-4 text-primary absolute top-2 right-2" />
                      )}
                      <t.icon className="h-6 w-6 mx-auto text-muted-foreground" />
                      <p className="text-sm font-medium">{t.label}</p>
                      <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "goals" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Study Goals</h2>
                  <p className="text-sm text-muted-foreground">Set your preparation targets.</p>
                </div>

                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Primary Goal</label>
                    <select
                      value={studyGoal}
                      onChange={(e) => setStudyGoal(e.target.value)}
                      className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm"
                    >
                      <option value="crack_gate">Crack GATE DA</option>
                      <option value="improve_score">Improve GATE Score</option>
                      <option value="learn_concepts">Learn Concepts</option>
                      <option value="daily_practice">Daily Practice</option>
                    </select>
                  </div>

                  <Button variant="hero" onClick={handleSaveProfile} disabled={saving} className="gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save Goals"}
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Security</h2>
                  <p className="text-sm text-muted-foreground">Update your password.</p>
                </div>

                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="••••••••"
                    />
                  </div>

                  <Button variant="hero" onClick={handleChangePassword} disabled={saving || !newPassword} className="gap-2">
                    <Lock className="h-4 w-4" />
                    {saving ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Notifications</h2>
                  <p className="text-sm text-muted-foreground">Manage your notification preferences.</p>
                </div>

                <div className="space-y-4 max-w-md">
                  {["Daily practice reminders", "Weekly progress reports", "New content alerts", "Achievement notifications"].map((item) => (
                    <label key={item} className="flex items-center justify-between p-3 rounded-lg border">
                      <span className="text-sm">{item}</span>
                      <input type="checkbox" defaultChecked className="h-4 w-4 accent-primary" />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
