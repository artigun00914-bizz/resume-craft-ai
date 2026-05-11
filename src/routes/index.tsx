import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Download, Sparkles, Trash2, Moon, Sun, Copy, Undo2, Redo2, FileText } from "lucide-react";
import { ProfileBar } from "@/components/ProfileBar";
import { ResumeDocument } from "@/components/ResumeDocument";
import { GenerationProgress } from "@/components/GenerationProgress";
import { DEFAULT_PROFILE, type ResumeData } from "@/types/resume";
import { generateResume, generateCoverLetter } from "@/lib/resume.functions";
import { exportPDF, exportDOCX, exportCoverLetterPDF } from "@/lib/resume-export";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Resume Generator — ATS-Optimized in Seconds" },
      { name: "description", content: "Paste a job description and instantly generate a tailored, ATS-optimized resume. Edit live, export to PDF or DOCX." },
    ],
  }),
  component: Index,
});

const STORAGE_KEY = "ai-resume:v1";
const PROFILE_KEY = "ai-resume:profile:v1";

function Index() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [history, setHistory] = useState<ResumeData[]>([]);
  const [future, setFuture] = useState<ResumeData[]>([]);
  const [dark, setDark] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);

  // Load
  useEffect(() => {
    try {
      const p = localStorage.getItem(PROFILE_KEY);
      if (p) setProfile(JSON.parse(p));
      const r = localStorage.getItem(STORAGE_KEY);
      if (r) setResume(JSON.parse(r));
    } catch {}
  }, []);

  // Persist
  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);
  useEffect(() => {
    if (resume) localStorage.setItem(STORAGE_KEY, JSON.stringify(resume));
  }, [resume]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const updateResume = (next: ResumeData) => {
    setResume((prev) => {
      if (prev) setHistory((h) => [...h.slice(-30), prev]);
      setFuture([]);
      return next;
    });
  };

  const undo = () => {
    setHistory((h) => {
      if (!h.length || !resume) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [resume, ...f]);
      setResume(prev);
      return h.slice(0, -1);
    });
  };

  const redo = () => {
    setFuture((f) => {
      if (!f.length || !resume) return f;
      const next = f[0];
      setHistory((h) => [...h, resume]);
      setResume(next);
      return f.slice(1);
    });
  };

  const handleGenerate = async () => {
    if (!jd.trim()) {
      toast.error("Paste a job description first");
      return;
    }
    setLoading(true);
    try {
      const result = await generateResume({
        data: {
          jobDescription: jd,
          profile: { ...profile, education: profile.education[0] },
        },
      });
      const full: ResumeData = {
        ...profile,
        education: profile.education,
        ...result,
      };
      setHistory([]);
      setFuture([]);
      setResume(full);
      toast.success(`Resume generated • ATS Score ${full.atsScore}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePDF = async () => {
    if (!resume) return;
    toast.promise(exportPDF(resume, resume.name), {
      loading: "Building PDF…",
      success: "PDF downloaded",
      error: "PDF export failed",
    });
  };

  const handleDOCX = async () => {
    if (!resume) return;
    toast.promise(exportDOCX(resume, resume.name), {
      loading: "Building DOCX…",
      success: "DOCX downloaded",
      error: "DOCX export failed",
    });
  };

  const copyText = () => {
    if (!docRef.current) return;
    navigator.clipboard.writeText(docRef.current.innerText);
    toast.success("Resume text copied");
  };

  const matchPct = useMemo(() => {
    if (!resume || !jd) return 0;
    const words = new Set(jd.toLowerCase().match(/[a-z0-9+.#]{3,}/g) ?? []);
    const hits = resume.matchedKeywords.filter((k) => words.has(k.toLowerCase())).length;
    return Math.min(100, Math.round((hits / Math.max(1, resume.matchedKeywords.length)) * 100));
  }, [resume, jd]);

  return (
    <div className="min-h-screen">
      <Toaster richColors position="top-center" />

      {/* Top sticky profile */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="max-w-[1500px] mx-auto px-4 lg:px-8 py-3 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-[image:var(--gradient-primary)] flex items-center justify-center shadow-[var(--shadow-elegant)]">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold gradient-text leading-none">Resume Forge AI</h1>
                <p className="text-[11px] text-muted-foreground">ATS-optimized resumes, written like a human</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setDark((d) => !d)} aria-label="Toggle theme">
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <ProfileBar profile={profile} onChange={(p) => setProfile({ ...profile, ...p })} />
        </div>
      </header>

      {/* Body */}
      <main className="max-w-[1500px] mx-auto px-4 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
        {/* Left */}
        <aside className="space-y-4 lg:sticky lg:top-[210px] lg:self-start">
          <Card className="p-4 glass">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Job Description
              </h2>
              <span className="text-xs text-muted-foreground">{jd.length} chars</span>
            </div>
            <Textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste Job Description Here..."
              className="min-h-[280px] resize-none font-mono text-[13px]"
            />
            <div className="flex gap-2 mt-3">
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1 bg-[image:var(--gradient-primary)] hover:opacity-90 shadow-[var(--shadow-elegant)]"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {loading ? "Generating…" : "Generate Resume"}
              </Button>
              <Button variant="outline" onClick={() => setJd("")} disabled={loading}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          <GenerationProgress active={loading} />

          {resume && (
            <Card className="p-4 glass space-y-3">
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <h3 className="text-sm font-semibold">ATS Score</h3>
                  <span className="text-2xl font-bold gradient-text">{resume.atsScore}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-[image:var(--gradient-primary)] transition-all"
                    style={{ width: `${resume.atsScore}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <h3 className="text-sm font-semibold">Keyword Match</h3>
                  <span className="text-sm text-muted-foreground">{matchPct}%</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {resume.matchedKeywords.slice(0, 24).map((k) => (
                    <span
                      key={k}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </aside>

        {/* Right */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="font-semibold text-lg">Resume Preview</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="ghost" size="sm" onClick={undo} disabled={!history.length}>
                <Undo2 className="h-4 w-4 mr-1" /> Undo
              </Button>
              <Button variant="ghost" size="sm" onClick={redo} disabled={!future.length}>
                <Redo2 className="h-4 w-4 mr-1" /> Redo
              </Button>
              <Button variant="outline" size="sm" onClick={copyText} disabled={!resume}>
                <Copy className="h-4 w-4 mr-1" /> Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handleDOCX} disabled={!resume}>
                <Download className="h-4 w-4 mr-1" /> DOCX
              </Button>
              <Button
                size="sm"
                onClick={handlePDF}
                disabled={!resume}
                className="bg-[image:var(--gradient-primary)] hover:opacity-90 shadow-[var(--shadow-elegant)]"
              >
                <Download className="h-4 w-4 mr-1" /> PDF
              </Button>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden shadow-[var(--shadow-elegant)] border border-border bg-white">
            {resume ? (
              <div ref={docRef}>
                <ResumeDocument data={resume} onChange={updateResume} />
              </div>
            ) : (
              <EmptyState />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="resume-doc px-12 py-20 text-center">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-[image:var(--gradient-primary)] flex items-center justify-center mb-4">
        <Sparkles className="h-7 w-7 text-white" />
      </div>
      <h3 className="text-2xl font-bold mb-2" style={{ color: "#111827" }}>
        Your tailored resume will appear here
      </h3>
      <p className="text-gray-600 max-w-md mx-auto">
        Paste a job description on the left and click <b>Generate Resume</b>. We'll extract the key skills,
        match keywords, and write human-style bullets in seconds.
      </p>
    </div>
  );
}
