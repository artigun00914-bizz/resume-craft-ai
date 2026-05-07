import { useEffect, useRef, useState } from "react";
import type { ResumeData } from "@/types/resume";

type Props = { data: ResumeData; onChange: (next: ResumeData) => void };

function Editable({
  value,
  onChange,
  className,
  as: Tag = "span" as any,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  as?: any;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) ref.current.innerText = value;
  }, [value]);
  return (
    // @ts-expect-error dynamic tag
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={className}
      onBlur={(e: any) => onChange(e.currentTarget.innerText)}
    />
  );
}

export function ResumeDocument({ data, onChange }: Props) {
  const update = <K extends keyof ResumeData>(k: K, v: ResumeData[K]) => onChange({ ...data, [k]: v });

  return (
    <div className="resume-doc px-12 py-10 text-[13px] leading-relaxed">
      {/* Header */}
      <header className="mb-5">
        <Editable as="h1" value={data.name} onChange={(v) => update("name", v)} className="text-5xl" />
        <Editable as="div" value={data.headline} onChange={(v) => update("headline", v)} className="text-base text-gray-700 mt-1" />
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-gray-700">
          <Editable value={`✉ ${data.email}`} onChange={(v) => update("email", v.replace(/^✉\s*/, ""))} />
          <Editable value={`☎ ${data.phone}`} onChange={(v) => update("phone", v.replace(/^☎\s*/, ""))} />
          <Editable value={`📍 ${data.location}`} onChange={(v) => update("location", v.replace(/^📍\s*/, ""))} />
        </div>
        <div className="border-t border-gray-300 mt-4" />
      </header>

      <Section title="Summary">
        <Editable as="p" value={data.summary} onChange={(v) => update("summary", v)} className="text-[13px]" />
      </Section>

      <Section title="Experience">
        {data.experience.map((exp, i) => (
          <div key={i} className="mb-4">
            <div className="flex justify-between items-baseline">
              <Editable
                value={exp.company}
                onChange={(v) => {
                  const next = [...data.experience];
                  next[i] = { ...exp, company: v };
                  update("experience", next);
                }}
                className="font-bold text-[14px]"
              />
              <Editable
                value={exp.location}
                onChange={(v) => {
                  const next = [...data.experience];
                  next[i] = { ...exp, location: v };
                  update("experience", next);
                }}
                className="text-[12px] text-gray-600"
              />
            </div>
            <div className="flex justify-between items-baseline">
              <Editable
                value={exp.title}
                onChange={(v) => {
                  const next = [...data.experience];
                  next[i] = { ...exp, title: v };
                  update("experience", next);
                }}
                className="italic text-[13px] text-gray-800"
              />
              <Editable
                value={`${exp.start} – ${exp.end}`}
                onChange={(v) => {
                  const [s, e] = v.split(/\s*[–-]\s*/);
                  const next = [...data.experience];
                  next[i] = { ...exp, start: s ?? exp.start, end: e ?? exp.end };
                  update("experience", next);
                }}
                className="text-[12px] text-gray-600"
              />
            </div>
            <ul className="list-disc pl-5 mt-1.5 space-y-1">
              {exp.bullets.map((b, j) => (
                <li key={j}>
                  <Editable
                    as="span"
                    value={b}
                    onChange={(v) => {
                      const next = [...data.experience];
                      const bullets = [...exp.bullets];
                      bullets[j] = v;
                      next[i] = { ...exp, bullets };
                      update("experience", next);
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section title="Skills">
        <ul className="space-y-1">
          {data.skills.map((s, i) => (
            <li key={i}>
              <Editable
                value={s.category}
                onChange={(v) => {
                  const next = [...data.skills];
                  next[i] = { ...s, category: v };
                  update("skills", next);
                }}
                className="font-semibold"
              />
              <span>: </span>
              <Editable
                value={s.items}
                onChange={(v) => {
                  const next = [...data.skills];
                  next[i] = { ...s, items: v };
                  update("skills", next);
                }}
              />
            </li>
          ))}
        </ul>
      </Section>

      {data.projects.length > 0 && (
        <Section title="Projects">
          <ul className="space-y-1.5">
            {data.projects.map((p, i) => (
              <li key={i}>
                <Editable
                  value={p.name}
                  onChange={(v) => {
                    const next = [...data.projects];
                    next[i] = { ...p, name: v };
                    update("projects", next);
                  }}
                  className="font-semibold"
                />
                <span>: </span>
                <Editable
                  value={p.description}
                  onChange={(v) => {
                    const next = [...data.projects];
                    next[i] = { ...p, description: v };
                    update("projects", next);
                  }}
                />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {data.certifications.length > 0 && (
        <Section title="Certifications">
          <ul className="list-disc pl-5">
            {data.certifications.map((c, i) => (
              <li key={i}>
                <Editable
                  value={c}
                  onChange={(v) => {
                    const next = [...data.certifications];
                    next[i] = v;
                    update("certifications", next);
                  }}
                />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Education">
        {data.education.map((ed, i) => (
          <div key={i}>
            <Editable
              value={ed.school}
              onChange={(v) => {
                const next = [...data.education];
                next[i] = { ...ed, school: v };
                update("education", next);
              }}
              className="font-bold"
            />
            <span> — </span>
            <Editable
              value={ed.degree}
              onChange={(v) => {
                const next = [...data.education];
                next[i] = { ...ed, degree: v };
                update("education", next);
              }}
            />
          </div>
        ))}
      </Section>

      {data.tools.length > 0 && (
        <Section title="Tools & Technologies">
          <Editable
            value={data.tools.join(" • ")}
            onChange={(v) => update("tools", v.split(/\s*•\s*/).filter(Boolean))}
          />
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h2 className="text-[16px]">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
