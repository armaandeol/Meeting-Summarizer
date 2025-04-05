import { saveAs } from "file-saver";
import { PDFDocument, StandardFonts } from "pdf-lib";

export const exportJSON = (
  transcriptEntries,
  actionItems,
  sentimentData,
  topics,
  detectedEntities,
  detectedIntents,
  summary,
  segmentedAnalysis = [] // Add segmentedAnalysis parameter
) => {
  if (transcriptEntries.length === 0) {
    alert("No transcript data to export.");
    return;
  }

  const data = {
    transcript: transcriptEntries,
    actionItems,
    sentimentData,
    topics,
    detectedEntities,
    detectedIntents,
    summary,
    segmentedAnalysis, // Include in JSON export
    createdAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  saveAs(blob, `meeting-export-${Date.now()}.json`);
};

export const exportPDF = async (
  transcriptEntries,
  actionItems,
  topics,
  detectedEntities,
  detectedIntents,
  summary,
  segmentedAnalysis = [], // Add segmentedAnalysis parameter
  setIsExporting
) => {
  if (transcriptEntries.length === 0) {
    alert("No transcript data to export.");
    return;
  }

  setIsExporting(true);

  try {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const margin = 50;
    const contentWidth = width - 2 * margin;
    let y = height - margin;

    const addText = (text, size = 10, isBold = false, indent = 0) => {
      const lines = [];
      const words = text.split(" ");
      let currentLine = "";
      const currentFont = isBold ? boldFont : font;
      const maxWidth = contentWidth - indent;

      words.forEach((word) => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = currentFont.widthOfTextAtSize(testLine, size);
        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      });

      lines.push(currentLine);

      lines.forEach((line) => {
        if (y < margin + size) {
          page = pdfDoc.addPage();
          y = height - margin;
        }
        page.drawText(line, { x: margin + indent, y, size, font: currentFont });
        y -= size * 1.2;
      });

      y -= size * 0.3;
    };

    addText("Meeting Summary & Transcript", 18, true);
    addText(`Exported on: ${new Date().toLocaleString()}`, 10);
    y -= 20;

    if (summary) {
      addText("AI Summary (Deepgram):", 14, true);
      addText(summary, 10);
      y -= 10;
    }

    // Add segmented analysis section
    if (segmentedAnalysis.length > 0) {
      addText("Time-Segmented Analysis:", 14, true);
      y -= 5;

      // Process a maximum of 10 segments to avoid excessively long PDFs
      const displaySegments = segmentedAnalysis.slice(0, 10);

      displaySegments.forEach((segment, index) => {
        const segmentTime = new Date(segment.timestamp).toLocaleTimeString();
        addText(
          `Segment ${segment.segmentNumber} (${segmentTime}):`,
          12,
          true,
          10
        );

        if (segment.error) {
          addText(`Error: ${segment.error}`, 10, false, 20);
        } else {
          if (segment.sentiment) {
            addText(
              `Sentiment: ${segment.sentiment} (${
                segment.sentimentScore?.toFixed(2) || "N/A"
              })`,
              10,
              false,
              20
            );
          }

          if (segment.topics && segment.topics.length > 0) {
            addText(
              `Topics: ${segment.topics.map((t) => t.topic).join(", ")}`,
              10,
              false,
              20
            );
          }

          if (segment.intents && segment.intents.length > 0) {
            addText(
              `Intents: ${segment.intents.map((i) => i.intent).join(", ")}`,
              10,
              false,
              20
            );
          }
        }

        if (segment.transcript) {
          addText(
            `Transcript: ${segment.transcript.substring(0, 100)}${
              segment.transcript.length > 100 ? "..." : ""
            }`,
            10,
            false,
            20
          );
        }

        y -= 5;
      });

      if (segmentedAnalysis.length > 10) {
        addText(
          `... and ${segmentedAnalysis.length - 10} more segments (not shown)`,
          10,
          false,
          10
        );
      }

      y -= 10;
    }

    if (actionItems.length > 0) {
      addText("Action Items (Detected):", 14, true);
      actionItems.forEach((item) =>
        addText(
          `[ ] Speaker ${
            typeof item.speaker === "number" ? item.speaker : "?"
          }: ${item.text}`,
          10,
          false,
          10
        )
      );
      y -= 10;
    }

    if (topics.length > 0) {
      addText("Detected Topics (Deepgram):", 14, true);
      addText(topics.map((t) => t.topic).join(", "), 10);
      y -= 10;
    }

    if (detectedEntities.length > 0) {
      addText("Detected Entities (Deepgram):", 14, true);
      detectedEntities
        .slice(0, 15)
        .forEach((e) => addText(`- ${e.value} (${e.label})`, 10, false, 10));
      if (detectedEntities.length > 15) addText("...", 10, false, 10);
      y -= 10;
    }

    if (detectedIntents.length > 0) {
      addText("Detected Intents (Deepgram):", 14, true);
      detectedIntents
        .slice(0, 15)
        .forEach((i) => addText(`- ${i.intent}`, 10, false, 10));
      if (detectedIntents.length > 15) addText("...", 10, false, 10);
      y -= 10;
    }

    addText("Full Transcript:", 14, true);
    transcriptEntries.forEach((entry) => {
      addText(
        `Speaker ${typeof entry.speaker === "number" ? entry.speaker : "?"}: ${
          entry.text
        }`,
        10
      );
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    saveAs(blob, `meeting-export-${Date.now()}.pdf`);
  } catch (error) {
    console.error("Export Error: PDF generation failed:", error);
    alert("Failed to generate PDF.");
  }

  setIsExporting(false);
};
