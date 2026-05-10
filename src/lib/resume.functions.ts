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
  coverLetter: string;
  atsScore: number;
  matchedKeywords: string[];
};

const SYSTEM = `You are an elite resume writer who crafts ATS-optimized, human-sounding senior engineer resumes. Output ONLY valid JSON matching the provided tool schema. Rules:
- Tone: confident, specific, conversational-but-professional. Avoid clichés like "results-driven", "synergy", "leveraged".
- Every bullet starts with a strong action verb and includes a quantified outcome (%, $, time saved, scale).
- Mirror exact keywords/technologies from the job description naturally (no stuffing).
- Generate exactly 4 work experiences. The most recent MUST be at "Deep Sync" (Jan 2023 - Present), but the JOB TITLE for that role MUST be tailored to align with the target job description (e.g. "Senior Backend Engineer", "Staff ML Engineer", "Senior Frontend Engineer"). Same applies to the 3 prior invented companies — pick titles that map to the JD's seniority and discipline so the career arc reads as a natural progression toward this role.
- Invent 3 prior companies with realistic names tailored to the JD industry; durations should be contiguous and span ~10-12 years total.
- 5-6 bullets for current role, 4-5 for prior roles, 3 for the oldest.
- Summary: 3-4 sentences, first-person, achievement-led.
- Skills: generate 6-8 categories. Each category MUST list 6-10 specific, concrete items (frameworks, tools, methodologies, protocols) — NOT vague descriptors. Pull heavily from the job description. Example category: "Backend: Node.js, TypeScript, Go, gRPC, GraphQL, REST, Kafka, RabbitMQ, PostgreSQL, Redis".
- Projects: 2-3 relevant projects.
- coverLetter: 3-4 short paragraphs, first-person, addressed to "Dear Hiring Manager,". Reference 2-3 specific requirements from the JD and tie them to concrete accomplishments. End with "Sincerely,\\n{candidate name}". No placeholders like [Company]. Plain text with \\n\\n between paragraphs.
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
- Most recent company (must appear first): Deep Sync, Senior Software Engineer, Jan 2023 – Present
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
            coverLetter: { type: "string" },
            atsScore: { type: "number" },
            matchedKeywords: { type: "array", items: { type: "string" } },
          },
          required: ["summary", "experience", "skills", "projects", "certifications", "tools", "coverLetter", "atsScore", "matchedKeywords"],
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
