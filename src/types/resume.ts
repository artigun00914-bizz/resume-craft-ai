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
  linkedin?: string;
  summary: string;
  topSkills: string[];
  experience: Experience[];
  skills: SkillGroup[];
  education: Education[];
  projects: Project[];
  certifications: string[];
  tools: string[];
  atsScore: number;
  matchedKeywords: string[];
};

export const DEFAULT_PROFILE = {
  name: "Arthur Faison",
  headline: "SENIOR FULL-STACK AI/ML ENGINEER",
  email: "arthurfaison828@gmail.com",
  phone: "+1 (410) 615-0749",
  location: "Tamiment, PA, US",
  linkedin: "linkedin.com/in/the-arthur-vega",
  education: [
    {
      school: "Stanford University",
      degree: "Master of Science in Computer Science · (2014 - 2016)",
    },
    {
      school: "University of Phoenix",
      degree: "Bachelor of Science in Computer Science · (2010 - 2014)",
    },
  ],
};
