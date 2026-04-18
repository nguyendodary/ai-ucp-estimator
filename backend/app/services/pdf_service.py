"""PDF generation service for UCP analysis reports."""
from io import BytesIO
from datetime import datetime
from typing import List

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak


class PDFService:
    """Service for generating PDF reports from UCP analysis results."""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom styles for the PDF report."""
        # Use a unique prefix to avoid conflicts with default styles
        self.styles.add(
            ParagraphStyle(
                name="UCPTitle",
                parent=self.styles["Heading1"],
                fontSize=18,
                textColor=colors.HexColor("#1f2937"),
                spaceAfter=12,
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="UCPSubtitle",
                parent=self.styles["Heading2"],
                fontSize=14,
                textColor=colors.HexColor("#4b5563"),
                spaceAfter=8,
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="UCPBody",
                parent=self.styles["Normal"],
                fontSize=10,
                textColor=colors.HexColor("#374151"),
                spaceAfter=6,
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="UCPSmall",
                parent=self.styles["Normal"],
                fontSize=9,
                textColor=colors.HexColor("#6b7280"),
            )
        )

    def generate_pdf(
        self,
        project_name: str,
        created_at: str,
        actors: List[dict],
        use_cases: List[dict],
        metrics: dict,
    ) -> BytesIO:
        """Generate a PDF report from UCP analysis results."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.75 * inch,
            leftMargin=0.75 * inch,
            topMargin=0.75 * inch,
            bottomMargin=0.75 * inch,
        )

        elements = []

        # Title with project name
        elements.append(Paragraph(f"UCP Analysis Report: {project_name}", self.styles["UCPTitle"]))
        elements.append(Spacer(1, 0.1 * inch))

        # Project info
        elements.append(Paragraph(f"<b>Project:</b> {project_name}", self.styles["UCPBody"]))
        elements.append(Paragraph(f"<b>Created:</b> {created_at}", self.styles["UCPBody"]))
        elements.append(Spacer(1, 0.3 * inch))

        # Metrics section
        elements.append(Paragraph("Metrics", self.styles["UCPSubtitle"]))
        metrics_data = [
            ["Metric", "Value"],
            ["UAW", f"{metrics.get('uaw', 0):.1f}"],
            ["UUCW", f"{metrics.get('uucw', 0):.1f}"],
            ["UUCP", f"{metrics.get('uucp', metrics.get('uaw', 0) + metrics.get('uucw', 0)):.1f}"],
            ["TCF", f"{metrics.get('tcf', 0):.3f}"],
            ["ECF", f"{metrics.get('ecf', 0):.3f}"],
            ["UCP", f"{metrics.get('ucp', 0):.2f}"],
            ["Effort (hours)", f"{metrics.get('effort_hours', 0):.1f}"],
        ]
        metrics_table = Table(metrics_data, colWidths=[2 * inch, 2 * inch])
        metrics_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#3b82f6")),
                ("TEXTCOLOR", (0, 0), (0, 0), colors.white),
                ("FONTNAME", (0, 0), (0, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (0, 0), 10),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f9fafb")),
                ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#e5e7eb")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 1), (-1, -1), 9),
            ])
        )
        elements.append(metrics_table)
        elements.append(Spacer(1, 0.3 * inch))

        # Actors section
        elements.append(Paragraph("Actors", self.styles["UCPSubtitle"]))
        if actors:
            actor_data = [["Name", "Type", "Weight"]]
            for actor in actors:
                actor_data.append([
                    actor.get("name", ""),
                    actor.get("actor_type", actor.get("type", "")),
                    str(actor.get("weight", 0)),
                ])
            actor_table = Table(actor_data, colWidths=[2.5 * inch, 1.5 * inch, 1 * inch])
            actor_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#3b82f6")),
                    ("TEXTCOLOR", (0, 0), (0, 0), colors.white),
                    ("FONTNAME", (0, 0), (0, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (0, 0), 10),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f9fafb")),
                    ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#e5e7eb")),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                    ("FONTSIZE", (0, 1), (-1, -1), 9),
                ])
            )
            elements.append(actor_table)
        else:
            elements.append(Paragraph("No actors found.", self.styles["UCPSmall"]))
        elements.append(Spacer(1, 0.3 * inch))

        # Use cases section
        elements.append(Paragraph("Use Cases", self.styles["UCPSubtitle"]))
        if use_cases:
            uc_data = [["Name", "Complexity", "Transactions", "Weight"]]
            for uc in use_cases:
                uc_data.append([
                    uc.get("name", ""),
                    uc.get("complexity", ""),
                    str(uc.get("transactions", "")),
                    str(uc.get("weight", 0)),
                ])
            uc_table = Table(uc_data, colWidths=[2.5 * inch, 1.2 * inch, 1 * inch, 0.8 * inch])
            uc_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#3b82f6")),
                    ("TEXTCOLOR", (0, 0), (0, 0), colors.white),
                    ("FONTNAME", (0, 0), (0, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (0, 0), 10),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f9fafb")),
                    ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#e5e7eb")),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                    ("FONTSIZE", (0, 1), (-1, -1), 9),
                ])
            )
            elements.append(uc_table)
        else:
            elements.append(Paragraph("No use cases found.", self.styles["UCPSmall"]))

        elements.append(Spacer(1, 0.5 * inch))
        elements.append(Paragraph(f"Generated by AI-powered UCP Estimator on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", self.styles["UCPSmall"]))

        doc.build(elements)
        buffer.seek(0)
        return buffer


pdf_service = PDFService()
