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
const BOTTOM_MARGIN = 8;
const CONTENT_W = A4_W - MARGIN * 2;

type RGB = [number, number, number];
const ACCENT: RGB = [31, 41, 55];
const MUTED: RGB = [75, 85, 99];
const RULE: RGB = [209, 213, 219];
const BODY: RGB = [17, 24, 39];

export async function exportPDF(data: ResumeData, name: string) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  pdf.setFont("times", "normal");

  let y = MARGIN;

  const ensure = (need: number) => {
    if (y + need > A4_H - BOTTOM_MARGIN) {
      pdf.addPage();
      y = MARGIN;
    }
  };

  const setColor = (c: RGB) => pdf.setTextColor(c[0], c[1], c[2]);

  const text = (
    str: string,
    opts: { size?: number; style?: "normal" | "bold" | "italic"; color?: RGB; x?: number; align?: "left" | "right" | "center" | "justify"; maxW?: number; lineHeight?: number; font?: string } = {}
  ) => {
    const size = opts.size ?? 10;
    const style = opts.style ?? "normal";
    const color = opts.color ?? BODY;
    const x = opts.x ?? MARGIN;
    const maxW = opts.maxW ?? CONTENT_W;
    const lh = opts.lineHeight ?? 1.35;
    pdf.setFont(opts.font ?? "times", style);
    pdf.setFontSize(size);
    setColor(color);
    const lines = pdf.splitTextToSize(str, maxW) as string[];
    const lineH = (size * lh) / 2.83465; // pt -> mm
    if (opts.align === "justify") {
      const totalH = lines.length * lineH;
      ensure(totalH);
      const prevFactor = pdf.getLineHeightFactor();
      pdf.setLineHeightFactor(lh);
      pdf.text(lines, x, y, { align: "justify", maxWidth: maxW });
      pdf.setLineHeightFactor(prevFactor);
      y += totalH;
    } else {
      for (const line of lines) {
        ensure(lineH);
        pdf.text(line, x, y, {
          align: opts.align === "right" ? "right" : opts.align === "center" ? "center" : "left",
          maxWidth: maxW,
        });
        y += lineH;
      }
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
    y += 6;
    ensure(12);
    pdf.setFont("times", "bold");
    pdf.setFontSize(15);
    setColor(ACCENT);
    pdf.text(label.toUpperCase(), MARGIN, y, { charSpace: 0.6 });
    y += 2.5;
    pdf.setDrawColor(RULE[0], RULE[1], RULE[2]);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN, y, A4_W - MARGIN, y);
    y += 5;
  };

  const row = (left: string, right: string, opts: { leftStyle?: "bold" | "italic" | "normal"; leftSize?: number; leftColor?: RGB; rightSize?: number; rightColor?: RGB } = {}) => {
    const leftSize = opts.leftSize ?? 11;
    const rightSize = opts.rightSize ?? 9.5;
    const leftStyle = opts.leftStyle ?? "bold";
    const leftColor = opts.leftColor ?? ACCENT;
    const rightColor = opts.rightColor ?? MUTED;
    const lineH = (Math.max(leftSize, rightSize) * 1.35) / 2.83465;
    ensure(lineH);
    pdf.setFont("times", leftStyle);
    pdf.setFontSize(leftSize);
    setColor(leftColor);
    pdf.text(left, MARGIN, y);
    pdf.setFont("times", "normal");
    pdf.setFontSize(rightSize);
    setColor(rightColor);
    pdf.text(right, A4_W - MARGIN, y, { align: "right" });
    y += lineH;
  };

  const bullet = (str: string) => {
    const size = 10;
    const lh = 1.4;
    const lineH = (size * lh) / 2.83465;
    pdf.setFont("times", "normal");
    pdf.setFontSize(size);
    setColor(BODY);
    const indent = 4;
    const maxW = CONTENT_W - indent;
    const lines = pdf.splitTextToSize(str, maxW) as string[];
    const totalH = lines.length * lineH;
    ensure(totalH);
    const prevFactor = pdf.getLineHeightFactor();
    pdf.setLineHeightFactor(lh);
    pdf.text("•", MARGIN + 1, y);
    pdf.text(lines, MARGIN + indent, y, { align: "justify", maxWidth: maxW });
    pdf.setLineHeightFactor(prevFactor);
    y += totalH;
  };

  // Header
  pdf.setFont("times", "bold");
  pdf.setFontSize(26);
  setColor([30, 58, 138]);
  y += (26 * 0.85) / 2.83465;
  pdf.text(data.name, A4_W / 2, y, { align: "center" });
  pdf.setFont("times", "bold");
  pdf.setFontSize(13);
  y += (13 * 0.95) / 2.83465;
  pdf.text(data.headline, A4_W / 2, y, { align: "center" });
  y += (13 * 0.4) / 2.83465 + 2.5;
  const contactParts = [data.email, data.phone, data.location, data.linkedin].filter(Boolean);
  text(contactParts.join("   •   "), { size: 9.5, color: MUTED, align: "center", x: A4_W / 2 });
  rule(1);

  heading("Summary");
  text(data.summary, { size: 10, align: "justify" });

  if (data.topSkills && data.topSkills.length) {
    heading("Top Skills");
    text(data.topSkills.join("  •  "), { size: 10, style: "bold", color: ACCENT, align: "justify" });
  }


  heading("Experience");
  data.experience.forEach((e) => {
    // Keep company header with title and first bullet on same page
    const headerBlock = 18;
    if (y + headerBlock > A4_H - BOTTOM_MARGIN) {
      pdf.addPage();
      y = MARGIN;
    }
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
    pdf.setFont("times", "bold");
    pdf.setFontSize(10);
    setColor(ACCENT);
    const label = `${s.category}: `;
    pdf.text(label, MARGIN, y);
    const labelW = pdf.getTextWidth(label);
    pdf.setFont("times", "normal");
    setColor(BODY);
    const lines = pdf.splitTextToSize(s.items, CONTENT_W - labelW) as string[];
    lines.forEach((line, i) => {
      if (i > 0) ensure(lineH);
      pdf.text(line, MARGIN + (i === 0 ? labelW : 0), y);
      if (i < lines.length - 1) y += lineH;
    });
    y += lineH;
  });


  heading("Education");
  data.education.forEach((ed) => {
    const lineH = (10 * 1.4) / 2.83465;
    ensure(lineH);
    pdf.setFont("times", "bold");
    pdf.setFontSize(10);
    setColor(ACCENT);
    pdf.text(ed.school, MARGIN, y);
    const w = pdf.getTextWidth(ed.school);
    pdf.setFont("times", "normal");
    setColor(BODY);
    pdf.text(` — ${ed.degree}`, MARGIN + w, y);
    y += lineH;
  });


  pdf.save(`${name.replace(/\s+/g, "_")}_Resume.pdf`);
}

export async function exportCoverLetterPDF(data: ResumeData, letter: string, name: string) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  pdf.setFont("times", "normal");
  let y = MARGIN;

  const setColor = (c: RGB) => pdf.setTextColor(c[0], c[1], c[2]);
  const ensure = (need: number) => {
    if (y + need > A4_H - BOTTOM_MARGIN) {
      pdf.addPage();
      y = MARGIN;
    }
  };
  const writeBlock = (str: string, size: number, style: "normal" | "bold" | "italic", color: RGB, lh = 1.5, align: "left" | "justify" = "left") => {
    pdf.setFont("times", style);
    pdf.setFontSize(size);
    setColor(color);
    const lines = pdf.splitTextToSize(str, CONTENT_W) as string[];
    const lineH = (size * lh) / 2.83465;
    if (align === "justify") {
      const totalH = lines.length * lineH;
      ensure(totalH);
      const prevFactor = pdf.getLineHeightFactor();
      pdf.setLineHeightFactor(lh);
      pdf.text(lines, MARGIN, y, { align: "justify", maxWidth: CONTENT_W });
      pdf.setLineHeightFactor(prevFactor);
      y += totalH;
    } else {
      for (const line of lines) {
        ensure(lineH);
        pdf.text(line, MARGIN, y, { align, maxWidth: CONTENT_W });
        y += lineH;
      }
    }
  };

  // Header (centered)
  pdf.setFont("times", "bold");
  pdf.setFontSize(22);
  setColor(ACCENT);
  pdf.text(data.name, A4_W / 2, y, { align: "center" });
  y += (22 * 1.3) / 2.83465;
  pdf.setFont("times", "bold");
  pdf.setFontSize(11);
  setColor(MUTED);
  pdf.text(data.headline, A4_W / 2, y, { align: "center" });
  y += (11 * 1.3) / 2.83465 + 1;
  const contact = [data.email, data.phone, data.location, data.linkedin].filter(Boolean).join("   •   ");
  pdf.setFont("times", "normal");
  pdf.setFontSize(9.5);
  setColor(MUTED);
  const contactLines = pdf.splitTextToSize(contact, CONTENT_W) as string[];
  const contactLineH = (9.5 * 1.3) / 2.83465;
  for (const line of contactLines) {
    ensure(contactLineH);
    pdf.text(line, A4_W / 2, y, { align: "center" });
    y += contactLineH;
  }

  // Rule
  y += 1.5;
  pdf.setDrawColor(RULE[0], RULE[1], RULE[2]);
  pdf.setLineWidth(0.2);
  pdf.line(MARGIN, y, A4_W - MARGIN, y);
  y += 6;

  // Date
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  writeBlock(today, 10, "normal", MUTED, 1.4);
  y += 4;

  // Salutation
  writeBlock("Dear Hiring Manager,", 11, "normal", BODY, 1.4);
  y += 3;

  // Body
  const paragraphs = letter.split(/\n\s*\n/);
  for (const p of paragraphs) {
    writeBlock(p.trim(), 11, "normal", BODY, 1.55, "justify");
    y += 3;
  }

  // Sign-off
  y += 2;
  writeBlock("Sincerely,", 11, "normal", BODY, 1.4);
  y += 1;
  writeBlock(data.name, 11, "bold", ACCENT, 1.4);

  pdf.save(`${name.replace(/\s+/g, "_")}_Cover_Letter.pdf`);
}

// Match PDF: A4 (11906 x 16838 DXA), ~14mm margins, Georgia typography
const FONT = "Georgia";
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
      alignment: AlignmentType.JUSTIFIED,
      children: [body(text)],
    });

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: data.name, bold: true, size: 36, font: FONT, color: ACCENT_HEX })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: data.headline, size: 20, font: FONT, color: MUTED_HEX, bold: true })],
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
  ];

  if (data.topSkills && data.topSkills.length) {
    children.push(sectionHeading("Top Skills"));
    children.push(
      new Paragraph({
        children: [body(data.topSkills.join("  •  "), { bold: true, color: ACCENT_HEX })],
      }),
    );
  }

  children.push(sectionHeading("Experience"));


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


  children.push(sectionHeading("Education"));
  data.education.forEach((ed) =>
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [body(ed.school, { bold: true, color: ACCENT_HEX }), body(` — ${ed.degree}`)],
      }),
    ),
  );


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
