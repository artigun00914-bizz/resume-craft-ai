import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
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
  PageBreak,
} from "docx";
import FileSaver from "file-saver";
const { saveAs } = FileSaver;
import type { ResumeData } from "@/types/resume";

// A4 in mm
const A4_W = 210;
const A4_H = 297;
const MARGIN = 14;
const CONTENT_W = A4_W - MARGIN * 2;
const CONTENT_H = A4_H - MARGIN * 2;
const GAP = 3;

// Render width in px for off-screen clone (good print resolution)
const RENDER_PX = 820;

async function renderSection(el: HTMLElement): Promise<{ data: string; w: number; h: number }> {
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });
  return { data: canvas.toDataURL("image/png"), w: canvas.width, h: canvas.height };
}

export async function exportPDF(source: HTMLElement, name: string) {
  // Clone off-screen at fixed width so layout is stable & A4-friendly
  const clone = source.cloneNode(true) as HTMLElement;
  const stage = document.createElement("div");
  stage.style.position = "fixed";
  stage.style.left = "-10000px";
  stage.style.top = "0";
  stage.style.width = `${RENDER_PX}px`;
  stage.style.background = "#ffffff";
  stage.style.color = "#111827";
  stage.appendChild(clone);
  document.body.appendChild(stage);

  // Strip contentEditable so caret/outline doesn't render
  clone.querySelectorAll("[contenteditable]").forEach((n) => {
    (n as HTMLElement).removeAttribute("contenteditable");
  });

  try {
    const sections = Array.from(clone.querySelectorAll<HTMLElement>("[data-pdf-section]"));
    const targets: HTMLElement[] = sections.length ? sections : [clone];

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    let cursorY = MARGIN;
    let first = true;

    for (const section of targets) {
      const { data, w, h } = await renderSection(section);
      const heightMM = (h * CONTENT_W) / w;

      if (heightMM <= CONTENT_H - (cursorY - MARGIN)) {
        pdf.addImage(data, "PNG", MARGIN, cursorY, CONTENT_W, heightMM);
        cursorY += heightMM + GAP;
        first = false;
      } else if (heightMM <= CONTENT_H) {
        // Section fits on a fresh page
        if (!first) pdf.addPage();
        cursorY = MARGIN;
        pdf.addImage(data, "PNG", MARGIN, cursorY, CONTENT_W, heightMM);
        cursorY += heightMM + GAP;
        first = false;
      } else {
        // Section taller than a page: slice it
        const pageHpx = (CONTENT_H * w) / CONTENT_W;
        let sy = 0;
        while (sy < h) {
          const sliceH = Math.min(pageHpx, h - sy);
          const c = document.createElement("canvas");
          c.width = w;
          c.height = sliceH;
          const ctx = c.getContext("2d")!;
          const img = new Image();
          img.src = data;
          await new Promise((r) => (img.onload = r));
          ctx.drawImage(img, 0, sy, w, sliceH, 0, 0, w, sliceH);
          const sliceData = c.toDataURL("image/png");
          const sliceMM = (sliceH * CONTENT_W) / w;
          if (!first) pdf.addPage();
          pdf.addImage(sliceData, "PNG", MARGIN, MARGIN, CONTENT_W, sliceMM);
          first = false;
          sy += sliceH;
          cursorY = MARGIN + sliceMM + GAP;
        }
      }
    }

    pdf.save(`${name.replace(/\s+/g, "_")}_Resume.pdf`);
  } finally {
    document.body.removeChild(stage);
  }
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
          text: `${data.email}    •    ${data.phone}    •    ${data.location}`,
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
        children: [
          body(e.company, { bold: true, color: ACCENT_HEX }),
          new TextRun({ text: `\t${e.location}`, size: 19, font: FONT, color: MUTED_HEX }),
        ],
      }),
      new Paragraph({
        spacing: { after: 60 },
        tabStops: [RIGHT_TAB],
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
