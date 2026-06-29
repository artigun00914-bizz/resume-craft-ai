import { createServerFn } from "@tanstack/react-start";

export type ResumeData = {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  summary: string;
  topSkills: string[];
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
- WORK HISTORY IS FIXED (do NOT invent companies, dates, titles, or locations). Use EXACTLY these roles, in this order (most recent first), tailoring ONLY the bullets to the JD:
  1. QUODD — Senior Software Engineer — New Jersey, United States — Jan 2022 – Present
  2. Quick Base — Software Engineer — Greater Boston Area — Jan 2020 – Feb 2022
  3. VersaTeach LLC — Software Programmer (Remote) — Albuquerque, New Mexico Area — Nov 2018 – May 2020
  4. TradeStation — Software Engineer — Richardson, Texas — Nov 2018 – Jan 2020
  5. CACI International Inc — Software Engineer — Rome, New York — Feb 2018 – Oct 2018
  6. Los Alamos National Laboratory — R&D Robotics Intern — Los Alamos, New Mexico — May 2017 – Jul 2017
  7. The University of New Mexico — Software Developer — Albuquerque, New Mexico Area — Aug 2016 – Jun 2017
  8. Halo River Management Group — Full Stack Developer — Rio Rancho, NM — May 2016 – Jul 2016
- BULLET COUNTS: 5-6 bullets for QUODD (current), 4-5 for Quick Base & TradeStation, 3-4 for VersaTeach & CACI, 2-3 for the earliest three roles. Keep bullets seniority-appropriate (earlier roles smaller scope / learning-oriented).
- NATURAL CAREER ARC: ~70-80% of bullets directly map to the JD's stack/responsibilities; ~20-30% should be authentic adjacent work (other languages, internal tools, mentorship, OSS, migrations).
- Summary: 3-4 sentences, first-person, achievement-led. Total experience is ~8 years (since 2018, full-time).
- TOP SKILLS: ALWAYS include a topSkills array of 5-8 short skill labels (single words / short phrases) tailored to the JD. The array MUST include "C#" and ".NET" as entries. Place the most JD-relevant skills first.
- Skills: 7-9 categories tailored to the JD. Each "items" string MUST list 6-10 specific, comma-separated technologies. Mirror JD keywords plus 2-4 adjacent technologies.
- Projects: 2-3 projects. At least one should be tangential/personal (OSS, side project) rather than a pure JD mirror.
- Certifications: Do NOT include a Certifications section. Return an empty array.
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

Use the FIXED work history specified in the SYSTEM rules (8 roles, exact companies/titles/dates/locations). Tailor only the bullets, summary, skills, topSkills, projects, tools, and matchedKeywords to the job description. The topSkills array MUST include "C#" and ".NET". Return JSON via the tool.`;

    const tool = {
      type: "function",
      function: {
        name: "build_resume",
        description: "Return the full structured resume",
        parameters: {
          type: "object",
          properties: {
            summary: { type: "string" },
            topSkills: { type: "array", items: { type: "string" } },
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
          required: ["summary", "topSkills", "experience", "skills", "projects", "tools", "atsScore", "matchedKeywords"],
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
    // Guarantee C# and .NET are present in topSkills
    const ts: string[] = Array.isArray(args.topSkills) ? args.topSkills.filter((s: any) => typeof s === "string") : [];
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "");
    const hasCS = ts.some((s) => norm(s) === "c#");
    const hasNet = ts.some((s) => norm(s) === ".net" || norm(s) === "net");
    if (!hasCS) ts.push("C#");
    if (!hasNet) ts.push(".NET");
    args.topSkills = ts;
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
