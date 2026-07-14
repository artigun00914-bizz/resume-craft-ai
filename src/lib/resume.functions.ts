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

const SYSTEM = `You are an elite resume writer who crafts ATS-optimized, human-sounding senior engineer resumes. Output ONLY valid JSON matching the provided tool schema.

GLOBAL RULES:
- Tone: confident, specific, professional. Avoid clichés like "results-driven", "synergy", "leveraged".
- Every experience bullet starts with a strong action verb. Quantify outcomes where reasonable but do NOT fabricate numbers.
- WORK HISTORY IS FIXED. Do NOT invent companies, dates, titles, or locations. Use EXACTLY these roles, in this order (most recent first):

  1. Sapience AI — Full-Stack AI/ML Developer — Remote — March 2026 – Present
     COMPANY CONTEXT: Sapience AI is a SMALL AI startup building full-stack AI-powered applications and production AI systems. Bullets MUST sound like startup engineering work at a small company — hands-on across the entire stack, shipping features end-to-end, not big-corp scope. Ground truth:
     - Develops full-stack, AI-powered applications and production AI systems
     - Designs and implements AI capabilities across backend services, APIs, data workflows, and user-facing apps
     - Builds scalable software solutions integrating ML models and LLMs
     - Collaborates across product and engineering to turn business requirements into AI products
     - Contributes to application architecture, model integration, deployment, testing, and production operations

  2. Prosper AI — Founding Full-Stack AI Engineer — Remote — August 2023 – October 2025
     COMPANY CONTEXT: Prosper AI is a SMALL healthcare-focused generative AI startup. Bullets MUST reflect founding-engineer work at a tiny company — owning architecture, wearing many hats, shipping the core product, small-team velocity. Ground truth:
     - Founding engineer responsible for architecture and development of a healthcare-focused generative AI platform
     - Built an LLM-powered conversational voice platform integrated with 80+ Electronic Health Record (EHR) systems
     - Automation handled ~50% of healthcare call-center workflows
     - Designed full-stack components spanning conversational AI, backend services, APIs, data integrations, and web interfaces
     - Built scalable systems for processing healthcare conversations and coordinating AI-assisted workflows
     - Led technical execution in a startup environment: product strategy, architecture, implementation, production delivery
     - Integrated generative AI and NLP into customer-facing healthcare applications
     - Improved operational efficiency by automating repetitive communication and admin processes

  3. Adobe — Computer Scientist — February 2020 – July 2023
     Ground truth:
     - Developed enterprise AI services and customer-facing AI solutions
     - Built cloud-native microservices for scalable, reliable production environments
     - Contributed to distributed ML infrastructure supporting enterprise AI workloads
     - Designed backend services and APIs to integrate ML capabilities into Adobe products
     - Supported development and deployment of production ML systems
     - Worked across AI engineering, cloud infrastructure, distributed systems, and application development
     - Applied engineering best practices for reliability, maintainability, scalability, and observability

  4. Google — Software Engineer II, L3 — September 2016 – February 2020
     Ground truth:
     - Developed machine learning platforms and cloud-based AI services
     - Contributed to Contact Center AI systems and integrations
     - Built and supported Kubernetes-based cloud infrastructure for scalable apps and ML workloads
     - Developed integrations with Google Cloud AI Platform services
     - Designed software components for distributed systems and production cloud environments
     - Collaborated with cross-functional engineering teams on reliable AI and cloud platform capabilities

- BULLET COUNTS: 5-7 bullets each for Sapience AI, Prosper AI, Adobe, and Google. EVERY ground-truth item for EVERY role MUST appear in the bullets (you may merge two closely related items into one bullet, but no fact may be dropped).
- TAILORING: Mirror the JD's exact keywords/technologies naturally inside bullets where they truthfully fit the role's ground truth. Never invent stack or scope outside ground truth. For Sapience AI and Prosper AI, keep the small-company / startup / founding-engineer voice — do NOT write enterprise-scale corporate bullets for those two.

SUMMARY RULES (IMPORTANT):
- Keep the summary SIMPLE and NORMAL. Plain, calm, human tone. 2-3 short sentences.
- Do NOT stuff JD keywords into the summary. Do NOT tailor the summary aggressively to the job description.
- State experience level, general focus area (full-stack AI/ML engineering, LLMs, cloud), and career background at a high level only.

SKILLS RULES:
- 6-8 categories, each with 6-10 specific comma-separated technologies.
- Mirror JD keywords naturally, but also cover the candidate's real stack: LLMs, Generative AI, Conversational AI, RAG, Multi-Agent, LangChain, OpenAI API, TensorFlow, Kubeflow, Dialogflow; Python, TypeScript, JavaScript, Java, Go, SQL; React, Next.js, Node.js, NestJS, Express, Django, FastAPI; REST, GraphQL, microservices; GCP, AWS, Kubernetes, Docker, Terraform; CI/CD, Jenkins, Grafana, Prometheus, Datadog; PostgreSQL, MongoDB, Redis, Elasticsearch, Firestore, BigQuery.

OTHER:
- projects: return an empty array.
- certifications: return an empty array.
- tools: return an empty array.
- topSkills: return an empty array.
- atsScore: realistic 82-96 based on JD match.
- matchedKeywords: 12-20 keywords actually present in JD and in resume.`;

export const generateResume = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as { jobDescription: string; profile: { name: string; headline: string; email: string; phone: string; location: string; education: { school: string; degree: string }[] } })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not set");

    const eduLines = data.profile.education.map((e) => `- ${e.school} — ${e.degree}`).join("\n");
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
- Education:
${eduLines}

Follow the SYSTEM rules. Keep the summary simple and NOT aggressively tailored to the JD. Write Sapience AI and Prosper AI bullets with a small-startup / founding-engineer voice, aligned to those companies' platforms — not corporate-scale. Cover EVERY ground-truth item for EVERY role. Do NOT invent stack outside ground truth. Return JSON via the tool.`;

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
            certifications: { type: "array", items: { type: "string" } },
            projects: { type: "array", items: { type: "string" } },
            tools: { type: "array", items: { type: "string" } },
            atsScore: { type: "number" },
            matchedKeywords: { type: "array", items: { type: "string" } },
          },
          required: ["summary", "experience", "skills", "atsScore", "matchedKeywords"],
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
    args.topSkills = [];

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
