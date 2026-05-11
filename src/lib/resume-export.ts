import jsPDF from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  TabStopType,
  TabStopPosition,
  BorderStyle,
  PageOrientation,
  LevelFormat,
} from "docx";
import FileSaver from "file-saver";
const { saveAs } = FileSaver;
import type { ResumeData } from "@/types/resume";

// A4 in mm
const A4_W = 210;
const A4_H = 297;
const MARGIN = 14;
const CONTENT_W = A4_W - MARGIN * 2;

type RGB = [number, number, number];
const ACCENT: RGB = [31, 41, 55];
const MUTED: RGB = [75, 85, 99];
const RULE: RGB = [209, 213, 219];
const BODY: RGB = [17, 24, 39];

export async function exportPDF(data: ResumeData, name: string) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  pdf.setFont("helvetica", "normal");

  let y = MARGIN;

  const ensure = (need: number) => {
    if (y + need > A4_H - MARGIN) {
      pdf.addPage();
      y = MARGIN;
    }
  };

  const setColor = (c: RGB) => pdf.setTextColor(c[0], c[1], c[2]);

  const text = (
    str: string,
    opts: { size?: number; style?: "normal" | "bold" | "italic"; color?: RGB; x?: number; align?: "left" | "right" | "justify"; maxW?: number; lineHeight?: number } = {}
  ) => {
    const size = opts.size ?? 10;
    const style = opts.style ?? "normal";
    const color = opts.color ?? BODY;
    const x = opts.x ?? MARGIN;
    const maxW = opts.maxW ?? CONTENT_W;
    const lh = opts.lineHeight ?? 1.35;
    pdf.setFont("helvetica", style);
    pdf.setFontSize(size);
    setColor(color);
    const lines = pdf.splitTextToSize(str, maxW) as string[];
    const lineH = (size * lh) / 2.83465; // pt -> mm
    for (const line of lines) {
      ensure(lineH);
      pdf.text(line, x, y, {
        align: opts.align === "right" ? "right" : opts.align === "justify" ? "justify" : "left",
        maxWidth: maxW,
      });
      y += lineH;
    }
  };

  const rule = (gap = 1.5) => {
    ensure(gap + 0.3);
    pdf.setDrawColor(RULE[0], RULE[1], RULE[2]);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN, y + gap, A4_W - MARGIN, y + gap);
    y += gap + 1.5;
  };

  const heading = (label: string) => {
    y += 2;
    ensure(8);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    setColor(ACCENT);
    pdf.text(label.toUpperCase(), MARGIN, y, { charSpace: 0.6 });
    y += 1.5;
    pdf.setDrawColor(RULE[0], RULE[1], RULE[2]);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN, y, A4_W - MARGIN, y);
    y += 3;
  };

  const row = (left: string, right: string, opts: { leftStyle?: "bold" | "italic" | "normal"; leftSize?: number; leftColor?: RGB; rightSize?: number; rightColor?: RGB } = {}) => {
    const leftSize = opts.leftSize ?? 11;
    const rightSize = opts.rightSize ?? 9.5;
    const leftStyle = opts.leftStyle ?? "bold";
    const leftColor = opts.leftColor ?? ACCENT;
    const rightColor = opts.rightColor ?? MUTED;
    const lineH = (Math.max(leftSize, rightSize) * 1.35) / 2.83465;
    ensure(lineH);
    pdf.setFont("helvetica", leftStyle);
    pdf.setFontSize(leftSize);
    setColor(leftColor);
    pdf.text(left, MARGIN, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(rightSize);
    setColor(rightColor);
    pdf.text(right, A4_W - MARGIN, y, { align: "right" });
    y += lineH;
  };

  const bullet = (str: string) => {
    const size = 10;
    const lh = 1.4;
    const lineH = (size * lh) / 2.83465;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(size);
    setColor(BODY);
    const indent = 4;
    const lines = pdf.splitTextToSize(str, CONTENT_W - indent) as string[];
    lines.forEach((line, i) => {
      ensure(lineH);
      if (i === 0) pdf.text("•", MARGIN + 1, y);
      pdf.text(line, MARGIN + indent, y);
      y += lineH;
    });
  };

  // Header
  text(data.name, { size: 22, style: "bold", color: ACCENT });
  text(data.headline, { size: 11, style: "bold", color: MUTED });
  y += 1;
  const contactParts = [data.email, data.phone, data.location, data.linkedin].filter(Boolean);
  text(contactParts.join("   •   "), { size: 9.5, color: MUTED });
  rule();

  heading("Summary");
  text(data.summary, { size: 10, align: "justify" });

  heading("Experience");
  data.experience.forEach((e) => {
    y += 1;
    row(e.company, e.location);
    row(e.title, `${e.start} – ${e.end}`, { leftStyle: "italic", leftSize: 10, leftColor: [55, 65, 81], rightSize: 9.5 });
    y += 0.5;
    e.bullets.forEach((b) => bullet(b));
  });

  heading("Skills");
  data.skills.forEach((s) => {
    const lineH = (10 * 1.4) / 2.83465;
    ensure(lineH);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    setColor(ACCENT);
    const label = `${s.category}: `;
    pdf.text(label, MARGIN, y);
    const labelW = pdf.getTextWidth(label);
    pdf.setFont("helvetica", "normal");
    setColor(BODY);
    const lines = pdf.splitTextToSize(s.items, CONTENT_W - labelW) as string[];
    lines.forEach((line, i) => {
      if (i > 0) ensure(lineH);
      pdf.text(line, MARGIN + (i === 0 ? labelW : 0), y);
      if (i < lines.length - 1) y += lineH;
    });
    y += lineH;
  });

  if (data.projects.length) {
    heading("Projects");
    data.projects.forEach((p) => bullet(`${p.name}: ${p.description}`));
  }

  if (data.certifications.length) {
    heading("Certifications");
    data.certifications.forEach((c) => bullet(c));
  }

  heading("Education");
  data.education.forEach((ed) => {
    const lineH = (10 * 1.4) / 2.83465;
    ensure(lineH);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    setColor(ACCENT);
    pdf.text(ed.school, MARGIN, y);
    const w = pdf.getTextWidth(ed.school);
    pdf.setFont("helvetica", "normal");
    setColor(BODY);
    pdf.text(` — ${ed.degree}`, MARGIN + w, y);
    y += lineH;
  });

  if (data.tools.length) {
    heading("Tools & Technologies");
    text(data.tools.join("  •  "), { size: 10 });
  }

  pdf.save(`${name.replace(/\s+/g, "_")}_Resume.pdf`);
}

// Match PDF: A4 (11906 x 16838 DXA), ~14mm margins, Helvetica/Arial typography
const FONT = "Helvetica";
const ACCENT_HEX = "1F2937";
const MUTED_HEX = "4B5563";
const RULE_HEX = "D1D5DB";
const RIGHT_TAB = { type: TabStopType.RIGHT, position: 10318 } as const;
const RULE_BORDER = {
  bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE_HEX, space: 4 },
};

export async function exportDOCX(data: ResumeData, name: string) {
  const sectionHeading = (text: string) =>
    new Paragraph({
      spacing: { before: 220, after: 100 },
      border: RULE_BORDER,
      keepNext: true,
      keepLines: true,
      children: [
        new TextRun({
          text: text.toUpperCase(),
          bold: true,
          size: 20,
          color: ACCENT_HEX,
          font: FONT,
          characterSpacing: 30,
        }),
      ],
    });

  const body = (text: string, opts: { bold?: boolean; italics?: boolean; color?: string } = {}) =>
    new TextRun({ text, size: 21, font: FONT, ...opts });

  const bullet = (text: string) =>
    new Paragraph({
      numbering: { reference: "bullets", level: 0 },
      spacing: { after: 60 },
      children: [body(text)],
    });

  const children: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: data.name, bold: true, size: 44, font: FONT, color: ACCENT_HEX })],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: data.headline, size: 24, font: FONT, color: MUTED_HEX, bold: true })],
    }),
    new Paragraph({
      border: RULE_BORDER,
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: [data.email, data.phone, data.location, data.linkedin].filter(Boolean).join("    •    "),
          size: 19,
          font: FONT,
          color: MUTED_HEX,
        }),
      ],
    }),
    sectionHeading("Summary"),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      children: [body(data.summary)],
    }),
    sectionHeading("Experience"),
  ];

  data.experience.forEach((e) => {
    children.push(
      new Paragraph({
        spacing: { before: 140 },
        tabStops: [RIGHT_TAB],
        keepNext: true,
        keepLines: true,
        children: [
          body(e.company, { bold: true, color: ACCENT_HEX }),
          new TextRun({ text: `\t${e.location}`, size: 19, font: FONT, color: MUTED_HEX }),
        ],
      }),
      new Paragraph({
        spacing: { after: 60 },
        tabStops: [RIGHT_TAB],
        keepNext: true,
        keepLines: true,
        children: [
          body(e.title, { italics: true, color: "374151" }),
          new TextRun({ text: `\t${e.start} – ${e.end}`, size: 19, font: FONT, color: MUTED_HEX }),
        ],
      }),
    );
    e.bullets.forEach((b) => children.push(bullet(b)));
  });

  children.push(sectionHeading("Skills"));
  data.skills.forEach((s) =>
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [
          body(`${s.category}: `, { bold: true, color: ACCENT_HEX }),
          body(s.items),
        ],
      }),
    ),
  );

  if (data.projects.length) {
    children.push(sectionHeading("Projects"));
    data.projects.forEach((p) =>
      children.push(
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          spacing: { after: 60 },
          children: [body(`${p.name}: `, { bold: true, color: ACCENT_HEX }), body(p.description)],
        }),
      ),
    );
  }

  if (data.certifications.length) {
    children.push(sectionHeading("Certifications"));
    data.certifications.forEach((c) => children.push(bullet(c)));
  }

  children.push(sectionHeading("Education"));
  data.education.forEach((ed) =>
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [body(ed.school, { bold: true, color: ACCENT_HEX }), body(` — ${ed.degree}`)],
      }),
    ),
  );

  if (data.tools.length) {
    children.push(sectionHeading("Tools & Technologies"));
    children.push(new Paragraph({ children: [body(data.tools.join("  •  "))] }));
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: FONT, size: 21 } } },
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 220 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT },
            margin: { top: 794, right: 794, bottom: 794, left: 794 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${name.replace(/\s+/g, "_")}_Resume.docx`);
}
