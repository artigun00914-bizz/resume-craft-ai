import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from "docx";
import FileSaver from "file-saver";
const { saveAs } = FileSaver;
import type { ResumeData } from "@/types/resume";

export async function exportPDF(element: HTMLElement, name: string) {
  const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;
  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }
  pdf.save(`${name.replace(/\s+/g, "_")}_Resume.pdf`);
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
