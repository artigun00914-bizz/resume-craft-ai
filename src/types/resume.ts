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
  headline: "SENIOR SOFTWARE ENGINEER",
  email: "mathaey_senit4@outlook.com",
  phone: "+1 (986) 255-1098",
  location: "Richardson, TX, US",
  linkedin: "linkedin.com/in/arthurnap24",
  education: [
    {
      school: "The University of New Mexico",
      degree: "Computer Science, Engineering · (2013 - 2017)",
    },
  ],
};
