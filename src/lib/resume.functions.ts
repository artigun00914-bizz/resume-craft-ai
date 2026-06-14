import { createServerFn } from "@tanstack/react-start";

export type ResumeData = {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  summary: string;
  experience: {
    company: string;
    location: string;
    title: string;
    start: string;
    end: string;
    bullets: string[];
  }[];
  skills: { category: string; items: string }[];
  education: { school: string; degree: string }[];
  projects: { name: string; description: string }[];
  certifications: string[];
  tools: string[];
  atsScore: number;
  matchedKeywords: string[];
};

const SYSTEM = `You are an elite resume writer who crafts ATS-optimized, human-sounding senior engineer resumes. Output ONLY valid JSON matching the provided tool schema. Rules:
- Tone: confident, specific, conversational-but-professional. Avoid clichés like "results-driven", "synergy", "leveraged".
- Every bullet starts with a strong action verb and includes a quantified outcome (%, $, time saved, scale).
- Mirror exact keywords/technologies from the job description naturally (no stuffing).
- YEARS OF EXPERIENCE: Infer the required years from the JD and match the total career span as tightly as possible — target required years + 0-2 only (e.g., "5+ years" JD → ~5-7 year career; "3+ years" → ~3-5; "10+ years" → ~10-12; "senior/staff" with no number → ~8-10; "junior/entry" → ~1-3). Do NOT inflate. Adjust the earliest role's start date so durations are contiguous and end at the present. Keep the Deep Sync (current) role's start at Jan 2023 only if the calibrated span allows; if the JD calls for fewer years than (now − Jan 2023), shorten Deep Sync's start date accordingly.
- ROLE COUNT & DURATIONS: Scale the number of work experiences to the calibrated span — 1-2 roles for ≤3 years, 2-3 roles for 4-6 years, 3-4 roles for 7-10 years, 4 roles for 10+ years. The most recent MUST be "Deep Sync" (Redmond, WA). Invent the remaining prior companies with realistic names. Keep each prior role's duration realistic (1.5–3.5 years typical); avoid padding.
- JOB TITLE PROGRESSION: Titles MUST show clear career growth toward the JD's target role. Walk the standard ladder appropriate to the JD's seniority, e.g.:
  - JD = Senior  → Junior/Associate → (Mid) Software Engineer → Senior Software Engineer (current)
  - JD = Staff   → Software Engineer → Senior → Staff Software Engineer (current)
  - JD = Lead/Principal → Senior → Lead/Staff → Principal (current)
  - JD = Mid    → Junior/Associate → Software Engineer (current)
  - JD = Junior → Intern/Associate → Junior Software Engineer (current)
  The current Deep Sync role's title MUST equal (or be one notch below) the JD's target title. Earlier roles use progressively more junior titles. Adapt the discipline word to the JD (e.g., Frontend, Backend, Full-Stack, Platform, Data, ML) instead of always "Software Engineer".
- NATURAL CAREER ARC (avoid the "forced fit" feel): ~70-80% of bullets should directly map to the JD's stack and responsibilities. The remaining ~20-30% should be authentic adjacent or tangential work — a different language/framework, internal tools/DX, a brief foray into another domain, mentorship, OSS, legacy migration, or a cross-functional project. Distribute these across older roles.
- BULLET COUNTS: 5-6 bullets for the current role, 4-5 for mid roles, 3 for the earliest. Each role should include at least one bullet that is NOT a direct JD keyword match but is still credible work for that seniority level. Earlier-career bullets must read at the right seniority (smaller scope, learning-oriented) — do not write principal-level impact in a junior role.
- Summary: 3-4 sentences, first-person, achievement-led. State the total years of experience consistent with the calibrated career span (no inflation).
- Skills: 7-9 categories tailored to the JD. Each "items" string MUST list 6-10 specific, comma-separated technologies (concrete tools, frameworks, protocols, methodologies). Mirror exact JD keywords, but also include 2-4 adjacent technologies the candidate would plausibly know.
- Projects: 2-3 projects. At least one should be tangential/personal (OSS, side project, hackathon) rather than a pure JD mirror.
- atsScore: realistic 82-96 based on JD match.
- matchedKeywords: 12-20 keywords actually present in JD and in resume.`;

export const generateResume = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as { jobDescription: string; profile: { name: string; headline: string; email: string; phone: string; location: string; education: { school: string; degree: string } } })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not set");

    const userPrompt = `JOB DESCRIPTION:
"""
${data.jobDescription}
"""

CANDIDATE BASE PROFILE (use exactly):
- Name: ${data.profile.name}
- Headline: ${data.profile.headline}
- Email: ${data.profile.email}
- Phone: ${data.profile.phone}
- Location: ${data.profile.location}
- Education: ${data.profile.education.degree} — ${data.profile.education.school}
- Most recent company (must appear first): Deep Sync (Redmond, WA), Senior Software Engineer, Jan 2023 – Present
- Generate 3 additional prior companies. Calibrate total career length to the JD's required years of experience (see SYSTEM rules). Weave in 1-2 bullets per older role that are adjacent or tangential to the JD so the career arc feels authentic, not retrofitted.

Tailor every bullet to the job description above. Return JSON via the tool.`;

    const tool = {
      type: "function",
      function: {
        name: "build_resume",
        description: "Return the full structured resume",
        parameters: {
          type: "object",
          properties: {
            summary: { type: "string" },
            experience: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  company: { type: "string" },
                  location: { type: "string" },
                  title: { type: "string" },
                  start: { type: "string" },
                  end: { type: "string" },
                  bullets: { type: "array", items: { type: "string" } },
                },
                required: ["company", "location", "title", "start", "end", "bullets"],
              },
            },
            skills: {
              type: "array",
              items: {
                type: "object",
                properties: { category: { type: "string" }, items: { type: "string" } },
                required: ["category", "items"],
              },
            },
            projects: {
              type: "array",
              items: {
                type: "object",
                properties: { name: { type: "string" }, description: { type: "string" } },
                required: ["name", "description"],
              },
            },
            certifications: { type: "array", items: { type: "string" } },
            tools: { type: "array", items: { type: "string" } },
            atsScore: { type: "number" },
            matchedKeywords: { type: "array", items: { type: "string" } },
          },
          required: ["summary", "experience", "skills", "projects", "certifications", "tools", "atsScore", "matchedKeywords"],
        },
      },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "build_resume" } },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      if (resp.status === 429) throw new Error("Rate limit reached. Please wait a moment and try again.");
      if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
      throw new Error(`AI gateway error: ${resp.status} ${text}`);
    }

    const json = await resp.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("No tool call returned");
    const args = JSON.parse(call.function.arguments);
    return args as Omit<ResumeData, "name" | "headline" | "email" | "phone" | "location" | "education">;
  });

export const generateCoverLetter = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as { jobDescription: string; resume: ResumeData })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not set");

    const topBullets = data.resume.experience
      .slice(0, 2)
      .flatMap((e) => e.bullets.slice(0, 3))
      .join("\n- ");

    const prompt = `Write a concise 3-4 sentence cover letter (first-person, confident, specific, no clichés) explaining why ${data.resume.name} is the right hire for the role below. Reference 1-2 concrete achievements from the resume that map to the job's needs. Do NOT include salutations, addresses, or sign-offs — only the body paragraph(s).

JOB DESCRIPTION:
"""
${data.jobDescription}
"""

CANDIDATE:
- Name: ${data.resume.name}
- Headline: ${data.resume.headline}
- Summary: ${data.resume.summary}
- Key achievements:
- ${topBullets}

Return ONLY the cover letter text.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      if (resp.status === 429) throw new Error("Rate limit reached. Please wait a moment and try again.");
      if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
      throw new Error(`AI gateway error: ${resp.status} ${text}`);
    }

    const json = await resp.json();
    const text: string = json.choices?.[0]?.message?.content ?? "";
    return { letter: text.trim() };
  });
