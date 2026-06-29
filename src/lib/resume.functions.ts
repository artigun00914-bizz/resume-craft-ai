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
- WORK HISTORY IS FIXED (do NOT invent companies, dates, titles, or locations). Use EXACTLY these roles, in this order (most recent first). Each role's "GROUND TRUTH" lists the candidate's real work — every bullet you write MUST be grounded in one of those facts (rephrased/tailored to JD keywords, quantified where reasonable), and EVERY ground-truth item must appear across the bullets in some form (either as a primary bullet or merged into one). Do NOT fabricate work that isn't represented in ground truth.

  1. QUODD — Senior Software Engineer — New Jersey, United States — Jan 2022 – Present
     GROUND TRUTH:
     - Ensure market data feed ingress from exchanges is processed properly
     - Write 100% testable C++ code with minimal code churn
     - Built a CI/CD pipeline that has shipped 100+ releases to QA and production
     - Feed experience: CTA, UTP, GIDS, CTF, OPRA, RussellTick, CME
     - Protocols: raw binary, SBE
     - On-call rotation, including 3 AM production incident response

  2. Quick Base — Software Engineer — Greater Boston Area — Jan 2020 – Feb 2022
     GROUND TRUTH:
     - Boosted overall system performance ~20% via asynchronous programming on the networking code (C++)
     - Drove testing effort that produced a 400% increase in C++ source files under test

  3. VersaTeach LLC — Software Programmer (Remote) — Albuquerque, New Mexico Area — Nov 2018 – May 2020
     GROUND TRUTH:
     - Wrote scripts to periodically migrate resumes from on-prem LAMP filesystem to AWS S3, running continuously on EC2 until decommission
     - Part-time maintenance of the company website
     - Built business-model solutions to advertise and grow services

  4. TradeStation — Software Engineer — Richardson, Texas — Nov 2018 – Jan 2020
     GROUND TRUTH:
     - Built a REST API on top of a large legacy C++ codebase, exposing software functionality as RESTful resources to enable automation
     - Used the C++ REST API plus PowerShell to automate user failovers
     - Leveraged AWS for software testing

  5. CACI International Inc — Software Engineer — Rome, New York — Feb 2018 – Oct 2018
     GROUND TRUTH:
     - Wrote multithreaded SOA software in Java, C++, and Python
     - Linux development with virtual machines, Docker, and databases

  6. Los Alamos National Laboratory — R&D Robotics Intern — Los Alamos, New Mexico — May 2017 – Jul 2017
     GROUND TRUTH:
     - Implemented software for the TA-53 neutron beam using the EPICS interface
     - Wrote/modified BASH scripts and config files on Linux

  7. The University of New Mexico — Software Developer — Albuquerque, New Mexico Area — Aug 2016 – Jun 2017
     GROUND TRUTH:
     - Built a Java software suite to classify patient stimulus reactions alongside real-time EEG brainwave data
     - Bridged Java frontend with a faster C/C++ backend to drive the EEG hardware

  8. Halo River Management Group — Full Stack Developer — Rio Rancho, NM — May 2016 – Jul 2016
     GROUND TRUTH:
     - Rewrote pages of the company web portal against their database
     - Wrote PHP scripts to connect the frontend with MySQL
     - Wrote and optimized MySQL queries

- BULLET COUNTS: 5-6 bullets for QUODD, 3-4 for Quick Base, 3-4 for TradeStation, 3 for VersaTeach & CACI, 2-3 for the earliest three roles. Earlier roles stay smaller-scope / learning-oriented. You may merge two related ground-truth items into one bullet if needed to stay within counts, but do not drop any ground-truth fact entirely.
- NATURAL CAREER ARC: tailor wording/keywords to the JD, but never invent stack or scope that isn't in ground truth. If the JD's stack differs from a role's ground truth, keep the bullet truthful and only bridge with phrasing (e.g. "applied similar async patterns later in...").
- Summary: 3-4 sentences, first-person, achievement-led. Total experience is ~8 years (since 2018, full-time).
- TOP SKILLS: ALWAYS include a topSkills array of 5-8 short skill labels. The array MUST include ALL of: "C++", "Python", "Java", "C#", ".NET". Add 1-3 more JD-relevant skills. Order with the most JD-relevant first while keeping all five mandatory entries present.
- Skills: 7-9 categories tailored to the JD. Each "items" string MUST list 6-10 specific, comma-separated technologies. Mirror JD keywords plus 2-4 adjacent technologies. Include at least one category that surfaces the candidate's real stack (C++, Python, Java, C#/.NET, PHP/MySQL, AWS/EC2/S3, Docker, Linux, PowerShell, EPICS, SBE/binary market-data protocols).

- Projects: Do NOT include a Projects section. Return an empty array.
- Certifications: Do NOT include a Certifications section. Return an empty array.
- Tools & Technologies: Do NOT include a Tools & Technologies section. Return an empty array.
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

Use the FIXED work history with GROUND TRUTH bullets specified in the SYSTEM rules. Every ground-truth fact for every role MUST be reflected in the bullets (rephrased to mirror JD keywords, quantified when natural). Do NOT invent stack or scope outside the ground truth. Do NOT generate projects or tools sections. The topSkills array MUST include all of: "C++", "Python", "Java", "C#", ".NET". Return JSON via the tool.`;

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
            certifications: { type: "array", items: { type: "string" } },
            projects: { type: "array", items: { type: "string" } },
            tools: { type: "array", items: { type: "string" } },
            atsScore: { type: "number" },
            matchedKeywords: { type: "array", items: { type: "string" } },
          },
          required: ["summary", "topSkills", "experience", "skills", "atsScore", "matchedKeywords"],
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
    // Guarantee mandatory top skills are present and ordered first
    const ts: string[] = Array.isArray(args.topSkills) ? args.topSkills.filter((s: any) => typeof s === "string") : [];
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "");
    const required: { label: string; match: (n: string) => boolean }[] = [
      { label: "C++", match: (n) => n === "c++" },
      { label: "Python", match: (n) => n === "python" },
      { label: "Java", match: (n) => n === "java" },
      { label: "C#", match: (n) => n === "c#" },
      { label: ".NET", match: (n) => n === ".net" || n === "net" || n === "dotnet" },
    ];
    const kept = ts.filter((s) => !required.some((r) => r.match(norm(s))));
    args.topSkills = [...required.map((r) => r.label), ...kept];

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
