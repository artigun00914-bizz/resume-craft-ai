import { useEffect, useRef } from "react";
import type { ResumeData } from "@/types/resume";

type Props = { data: ResumeData; onChange: (next: ResumeData) => void };

function Editable({
  value,
  onChange,
  className,
  style,
  as: Tag = "span" as any,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  style?: React.CSSProperties;
  as?: any;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) ref.current.innerText = value;
  }, [value]);
  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={className}
      style={style}
      onBlur={(e: any) => onChange(e.currentTarget.innerText)}
    />
  );
}

const ACCENT = "#1f2937";
const RULE = "#d1d5db";
const MUTED = "#4b5563";

export function ResumeDocument({ data, onChange }: Props) {
  const update = <K extends keyof ResumeData>(k: K, v: ResumeData[K]) => onChange({ ...data, [k]: v });

  return (
    <div
      className="resume-doc"
      style={{
        padding: "44px 56px",
        fontSize: 12.5,
        lineHeight: 1.5,
        color: "#111827",
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        background: "#ffffff",
      }}
    >
      {/* Header */}
      <header data-pdf-section style={{ marginBottom: 14 }}>
        <Editable
          as="h1"
          value={data.name}
          onChange={(v) => update("name", v)}
          style={{ fontSize: 45, fontWeight: 700, letterSpacing: -0.5, margin: 0, color: ACCENT }}
        />
        <Editable
          as="div"
          value={data.headline}
          onChange={(v) => update("headline", v)}
          style={{ fontSize: 21, color: MUTED, marginTop: 2, fontWeight: 500 }}
        />
        <div style={{ marginTop: 8, fontSize: 11.5, color: MUTED }}>
          <Editable value={data.email} onChange={(v) => update("email", v)} />
          <span style={{ margin: "0 10px", color: RULE }}>•</span>
          <Editable value={data.phone} onChange={(v) => update("phone", v)} />
          <span style={{ margin: "0 10px", color: RULE }}>•</span>
          <Editable value={data.location} onChange={(v) => update("location", v)} />
          {data.linkedin !== undefined && (
            <>
              <span style={{ margin: "0 10px", color: RULE }}>•</span>
              <Editable value={data.linkedin} onChange={(v) => update("linkedin", v)} />
            </>
          )}
        </div>
        <div style={{ borderTop: `1px solid ${RULE}`, marginTop: 12 }} />
      </header>

      <Section title="Summary">
        <Editable
          as="p"
          value={data.summary}
          onChange={(v) => update("summary", v)}
          style={{ margin: 0, textAlign: "justify" }}
        />
      </Section>

      <Section title="Experience">
        {data.experience.map((exp, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ textAlign: "left", padding: 0 }}>
                    <Editable
                      value={exp.company}
                      onChange={(v) => {
                        const next = [...data.experience];
                        next[i] = { ...exp, company: v };
                        update("experience", next);
                      }}
                      style={{ fontWeight: 700, fontSize: 13.5, color: ACCENT }}
                    />
                  </td>
                  <td style={{ textAlign: "right", padding: 0, fontSize: 11.5, color: MUTED, whiteSpace: "nowrap" }}>
                    <Editable
                      value={exp.location}
                      onChange={(v) => {
                        const next = [...data.experience];
                        next[i] = { ...exp, location: v };
                        update("experience", next);
                      }}
                    />
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: "left", padding: 0 }}>
                    <Editable
                      value={exp.title}
                      onChange={(v) => {
                        const next = [...data.experience];
                        next[i] = { ...exp, title: v };
                        update("experience", next);
                      }}
                      style={{ fontStyle: "italic", fontSize: 12.5, color: "#374151" }}
                    />
                  </td>
                  <td style={{ textAlign: "right", padding: 0, fontSize: 11.5, color: MUTED, whiteSpace: "nowrap" }}>
                    <Editable
                      value={`${exp.start} – ${exp.end}`}
                      onChange={(v) => {
                        const [s, e] = v.split(/\s*[–-]\s*/);
                        const next = [...data.experience];
                        next[i] = { ...exp, start: s ?? exp.start, end: e ?? exp.end };
                        update("experience", next);
                      }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
            <ul style={{ margin: "6px 0 0 0", paddingLeft: 18 }}>
              {exp.bullets.map((b, j) => (
                <li key={j} style={{ marginBottom: 3 }}>
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
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {data.skills.map((s, i) => (
            <li key={i} style={{ marginBottom: 3 }}>
              <Editable
                value={s.category}
                onChange={(v) => {
                  const next = [...data.skills];
                  next[i] = { ...s, category: v };
                  update("skills", next);
                }}
                style={{ fontWeight: 700, color: ACCENT }}
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
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {data.projects.map((p, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                <Editable
                  value={p.name}
                  onChange={(v) => {
                    const next = [...data.projects];
                    next[i] = { ...p, name: v };
                    update("projects", next);
                  }}
                  style={{ fontWeight: 700, color: ACCENT }}
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
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {data.certifications.map((c, i) => (
              <li key={i} style={{ marginBottom: 3 }}>
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
              style={{ fontWeight: 700, color: ACCENT }}
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
    <section data-pdf-section style={{ marginBottom: 12 }}>
      <h2
        style={{
          fontSize: 19.5,
          fontWeight: 700,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: ACCENT,
          margin: "0 0 6px 0",
          paddingBottom: 7,
          borderBottom: `1px solid ${RULE}`,
        }}
      >
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}
