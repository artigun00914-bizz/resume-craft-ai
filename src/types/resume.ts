export type Experience = {
  company: string;
  location: string;
  title: string;
  start: string;
  end: string;
  bullets: string[];
};

export type SkillGroup = { category: string; items: string };

export type Education = { school: string; degree: string };

export type Project = { name: string; description: string };

export type ResumeData = {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  summary: string;
  experience: Experience[];
  skills: SkillGroup[];
  education: Education[];
  projects: Project[];
  certifications: string[];
  tools: string[];
  coverLetter: string;
  atsScore: number;
  matchedKeywords: string[];
};

export const DEFAULT_PROFILE = {
  name: "Arthur Faison",
  headline: "Senior Software Engineer",
  email: "mathaey_senit4@outlook.com",
  phone: "+1 (986) 255-1098",
  location: "San Antonio, TX, US",
  linkedin: "linkedin.com/in/arthur-faison",
  education: [
    {
      school: "University of Texas at San Antonio",
      degree: "Bachelor of Science in Computer Science",
    },
  ],
};
