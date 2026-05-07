import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from "docx";
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

export async function exportDOCX(data: ResumeData, name: string) {
  const sectionHeading = (text: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
      children: [new TextRun({ text, bold: true, color: "4F46E5", size: 26 })],
    });

  const bullet = (text: string) =>
    new Paragraph({
      bullet: { level: 0 },
      spacing: { after: 80 },
      children: [new TextRun({ text, size: 22 })],
    });

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ text: data.name, bold: true, size: 56 })],
    }),
    new Paragraph({ children: [new TextRun({ text: data.headline, size: 26 })] }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({ text: `${data.email}  •  ${data.phone}  •  ${data.location}`, size: 20, color: "555555" }),
      ],
    }),
    sectionHeading("Summary"),
    new Paragraph({ children: [new TextRun({ text: data.summary, size: 22 })] }),
    sectionHeading("Experience"),
  ];

  data.experience.forEach((e) => {
    children.push(
      new Paragraph({
        spacing: { before: 160 },
        children: [
          new TextRun({ text: `${e.company}`, bold: true, size: 24 }),
          new TextRun({ text: `   ${e.location}`, size: 20, color: "777777" }),
        ],
      }),
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: e.title, italics: true, size: 22 }),
          new TextRun({ text: `   ${e.start} – ${e.end}`, size: 20, color: "777777" }),
        ],
      }),
    );
    e.bullets.forEach((b) => children.push(bullet(b)));
  });

  children.push(sectionHeading("Skills"));
  data.skills.forEach((s) =>
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({ text: `${s.category}: `, bold: true, size: 22 }),
          new TextRun({ text: s.items, size: 22 }),
        ],
      }),
    ),
  );

  if (data.projects.length) {
    children.push(sectionHeading("Projects"));
    data.projects.forEach((p) =>
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: `${p.name}: `, bold: true, size: 22 }),
            new TextRun({ text: p.description, size: 22 }),
          ],
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
        children: [
          new TextRun({ text: ed.school, bold: true, size: 22 }),
          new TextRun({ text: ` — ${ed.degree}`, size: 22 }),
        ],
      }),
    ),
  );

  if (data.tools.length) {
    children.push(sectionHeading("Tools & Technologies"));
    children.push(new Paragraph({ children: [new TextRun({ text: data.tools.join(" • "), size: 22 })] }));
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${name.replace(/\s+/g, "_")}_Resume.docx`);
}
