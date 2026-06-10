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
- YEARS OF EXPERIENCE: First, infer the seniority and required years from the JD (e.g., "5+ years", "senior", "staff", "10+ years"). Calibrate the total career span to match: target roughly required years + 2-4 (e.g., "5+ years" JD → ~7-9 year career; "10+ years" → ~12-14; "senior/staff" with no number → ~10-13). Adjust the earliest role's start date so durations are contiguous and end at the present.
- Generate exactly 4 work experiences. The most recent MUST be the user's "Recent Company" (Deep Sync, Jan 2023 – Present). Invent 3 prior companies with realistic names; durations contiguous, total span calibrated per the rule above.
- NATURAL CAREER ARC (avoid the "forced fit" feel): ~70-80% of bullets should directly map to the JD's stack and responsibilities. The remaining ~20-30% should be authentic adjacent or tangential work a real senior engineer accumulates — e.g., a stint with a different language/framework, internal tools or developer-experience, a brief foray into a different domain (data, mobile, infra, ML, embedded), mentorship/hiring, an open-source contribution, a legacy migration, or a cross-functional project (design system, analytics, growth). Distribute these across older roles so the resume reads like an actual career, not a keyword mirror.
- 5-6 bullets for current role, 4-5 for prior roles, 3 for the oldest. Each role should include at least one bullet that is NOT a direct JD keyword match but is still credible senior-engineer work.
- Summary: 3-4 sentences, first-person, achievement-led. State the total years of experience consistent with the calibrated career span.
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
- Generate 3 additional prior companies tailored to the JD's industry/tech.

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
