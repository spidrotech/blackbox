"""
Service de génération PDF professionnel pour les devis et factures.

Génère un document style Obat : A4, header 2 colonnes, tableau de lignes
groupées par section, récapitulatif TVA, bloc totaux, signature "bon pour accord",
numérotation des pages, filigrane BROUILLON.
"""

from __future__ import annotations

import io
import textwrap
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Optional

try:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.lib.utils import ImageReader, simpleSplit
    from reportlab.platypus import (
        HRFlowable,
        Image,
        KeepTogether,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )
    from reportlab.platypus.flowables import Flowable
    from reportlab.pdfgen import canvas as pdf_canvas

    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False


# ---------------------------------------------------------------------------
# Palette de couleurs Obat-inspired
# ---------------------------------------------------------------------------

C_PRIMARY = colors.HexColor("#1E3A5F")   # Bleu marine profond
C_ACCENT = colors.HexColor("#2563EB")    # Bleu vif
C_LIGHT = colors.HexColor("#EFF6FF")     # Fond bleu très clair
C_BORDER = colors.HexColor("#BFDBFE")    # Bordure bleue claire
C_TEXT = colors.HexColor("#1F2937")      # Texte principal
C_MUTED = colors.HexColor("#6B7280")     # Texte secondaire
C_WHITE = colors.white
C_GREEN = colors.HexColor("#16A34A")     # Vert (primes)
C_SECTION = colors.HexColor("#F1F5F9")   # Fond des en-têtes de section
C_SURFACE = colors.HexColor("#F8FAFC")   # Cartes claires
C_SOFT = colors.HexColor("#E2E8F0")      # Bordure douce

PAGE_W, PAGE_H = A4
MARGIN_L = 18 * mm
MARGIN_R = 18 * mm
MARGIN_T = 20 * mm
MARGIN_B = 20 * mm
USABLE_W = PAGE_W - MARGIN_L - MARGIN_R


# ---------------------------------------------------------------------------
# Structures de données légères
# ---------------------------------------------------------------------------

@dataclass
class LineItemData:
    designation: str
    long_description: str = ""
    section: str = ""
    quantity: float = 0.0
    unit: str = "u"
    unit_price: float = 0.0
    discount_percent: float = 0.0
    tax_rate: float = 20.0
    item_type: str = "supply"
    reference: str = ""

    @property
    def total_ht(self) -> float:
        sub = self.quantity * self.unit_price
        return sub * (1 - self.discount_percent / 100)

    @property
    def total_tva(self) -> float:
        return self.total_ht * self.tax_rate / 100

    @property
    def total_ttc(self) -> float:
        return self.total_ht + self.total_tva


@dataclass
class CompanyData:
    name: str = ""
    address: str = ""
    city: str = ""
    postal_code: str = ""
    country: str = "France"
    phone: str = ""
    email: str = ""
    website: str = ""
    siret: str = ""
    vat_number: str = ""
    vat_subject: bool = True
    iban: str = ""
    bic: str = ""
    logo_url: str = ""
    header_text: str = ""
    footer_text: str = ""
    rcs_city: str = ""
    rm_number: str = ""
    capital: float = 0.0
    ape_code: str = ""
    guarantee_type: str = ""
    insurance_name: str = ""
    insurance_coverage: str = ""
    insurance_address: str = ""
    insurance_zipcode: str = ""
    insurance_city: str = ""
    primary_color: str = ""
    accent_color: str = ""
    visuals_json: str = ""


@dataclass
class CustomerData:
    name: str = ""
    contact_name: str = ""
    address: str = ""
    city: str = ""
    postal_code: str = ""
    country: str = "France"
    phone: str = ""
    email: str = ""
    siret: str = ""
    vat: str = ""


@dataclass
class QuoteData:
    doc_type: str = "quote"  # quote | invoice
    reference: str = ""
    status: str = "draft"
    quote_date: str = ""
    expiry_date: str = ""
    work_start_date: str = ""
    estimated_duration: str = ""
    worksite_address: str = ""
    subject: str = ""
    notes: str = ""
    conditions: str = ""
    payment_terms: str = ""
    bank_details: str = ""
    footer_notes: str = ""
    legal_mentions: str = ""

    deposit_percent: float = 0.0
    global_discount_percent: float = 0.0
    cee_premium: float = 0.0
    mpr_premium: float = 0.0
    waste_management_fee: float = 0.0

    line_items: list[LineItemData] = field(default_factory=list)
    company: CompanyData = field(default_factory=CompanyData)
    customer: CustomerData = field(default_factory=CustomerData)


# ---------------------------------------------------------------------------
# Helpers stylization
# ---------------------------------------------------------------------------

def _fmt_euro(val: float) -> str:
    return f"{val:,.2f} €".replace(",", " ")


def _fmt_pct(val: float) -> str:
    return f"{val:.2f} %".replace(".", ",")


def _fmt_qty(val: float) -> str:
    if val == int(val):
        return str(int(val))
    return f"{val:.2f}"


def _clean_lines(lines: list[str]) -> list[str]:
    return [line.strip() for line in lines if line and line.strip()]


def _join_parts(parts: list[str], sep: str = " - ") -> str:
    return sep.join(part.strip() for part in parts if part and part.strip())


# ---------------------------------------------------------------------------
# Styles ReportLab
# ---------------------------------------------------------------------------

def _build_styles(
    c_primary: Any = None,
    c_accent: Any = None,
) -> dict[str, ParagraphStyle]:
    _primary = c_primary if c_primary is not None else C_PRIMARY
    _accent = c_accent if c_accent is not None else C_ACCENT
    base = getSampleStyleSheet()
    styles: dict[str, ParagraphStyle] = {}

    def add(name: str, **kw: Any) -> None:
        parent = kw.pop("parent", base["Normal"])
        styles[name] = ParagraphStyle(name, parent=parent, **kw)

    add("company_name", fontSize=14, fontName="Helvetica-Bold", textColor=_primary, leading=16)
    add("company_detail", fontSize=8, textColor=C_TEXT, leading=10)
    add("company_muted", fontSize=7.5, textColor=C_MUTED, leading=9)
    add("eyebrow", fontSize=7.5, fontName="Helvetica-Bold", textColor=_accent, leading=9, spaceAfter=2)
    add("doc_title", fontSize=22, fontName="Helvetica-Bold", textColor=_primary, alignment=TA_RIGHT, leading=26)
    add("doc_ref", fontSize=10, fontName="Helvetica-Bold", textColor=_accent, alignment=TA_RIGHT)
    add("doc_label", fontSize=8, textColor=C_MUTED, alignment=TA_RIGHT, leading=9)
    add("doc_value", fontSize=8, fontName="Helvetica-Bold", textColor=C_TEXT, alignment=TA_RIGHT, leading=9)
    add("block_title", fontSize=8, fontName="Helvetica-Bold", textColor=C_MUTED, spaceAfter=2)
    add("address_name", fontSize=10, fontName="Helvetica-Bold", textColor=C_TEXT, leading=12)
    add("address_detail", fontSize=9, textColor=C_TEXT, leading=11)
    add("subject", fontSize=11, fontName="Helvetica-Bold", textColor=C_TEXT, spaceAfter=6)
    add("section_header", fontSize=10, fontName="Helvetica-Bold", textColor=_primary)
    add("cell_designation", fontSize=8.5, textColor=C_TEXT, leading=10)
    add("cell_desc", fontSize=7.5, textColor=C_MUTED, leading=9)
    add("cell_num", fontSize=8.5, textColor=C_TEXT, alignment=TA_RIGHT)
    add("card_title", fontSize=8.5, fontName="Helvetica-Bold", textColor=C_MUTED, leading=10)
    add("card_value", fontSize=10, fontName="Helvetica-Bold", textColor=C_TEXT, leading=12)
    add("total_label", fontSize=9, textColor=C_TEXT)
    add("total_label_bold", fontSize=9, fontName="Helvetica-Bold", textColor=C_TEXT)
    add("total_value", fontSize=9, textColor=C_TEXT, alignment=TA_RIGHT)
    add("total_value_bold", fontSize=9, fontName="Helvetica-Bold", textColor=C_TEXT, alignment=TA_RIGHT)
    add("total_ttc_label", fontSize=11, fontName="Helvetica-Bold", textColor=C_WHITE)
    add("total_ttc_value", fontSize=11, fontName="Helvetica-Bold", textColor=C_WHITE, alignment=TA_RIGHT)
    add("footer_note", fontSize=7.5, textColor=C_MUTED, alignment=TA_CENTER)
    add("watermark", fontSize=60, fontName="Helvetica-Bold", textColor=colors.HexColor("#E2E8F0"), alignment=TA_CENTER)
    add("sign_label", fontSize=8, textColor=C_MUTED, alignment=TA_CENTER)
    add("sign_title", fontSize=9, fontName="Helvetica-Bold", textColor=C_TEXT, alignment=TA_CENTER)

    return styles


# ---------------------------------------------------------------------------
# Callback numérotation de pages + filigrane
# ---------------------------------------------------------------------------

class _PageTemplate:
    """Canvas callback : filigrane BROUILLON uniquement."""

    def __init__(self, is_draft: bool) -> None:
        self.is_draft = is_draft

    def __call__(self, canvas: Any, doc: Any) -> None:
        if not self.is_draft:
            return
        canvas.saveState()
        canvas.setFont("Helvetica-Bold", 70)
        canvas.setFillColor(colors.HexColor("#F1F5F9"))
        canvas.translate(PAGE_W / 2, PAGE_H / 2)
        canvas.rotate(45)
        canvas.drawCentredString(0, 0, "BROUILLON")
        canvas.rotate(-45)
        canvas.translate(-PAGE_W / 2, -PAGE_H / 2)
        canvas.restoreState()


def _build_footer_lines(company: CompanyData, footer_text: str) -> list[str]:
    """Build the footer text lines from company data or raw footer_text."""
    if footer_text:
        return _clean_lines(footer_text.split('\n'))

    co = company
    # Line 1: Company + legal
    company_parts = _join_parts([
        co.name, co.address,
        _join_parts([co.postal_code, co.city], sep=" "),
        co.country if co.country and co.country != "France" else "",
    ])
    legal_bits: list[str] = []
    if co.capital:
        legal_bits.append(f"SAS au capital de {int(co.capital):,} \u20ac".replace(",", " "))
    if co.siret:
        legal_bits.append(co.siret)
    if co.rcs_city:
        legal_bits.append(f"RCS {co.rcs_city}")
    if co.ape_code:
        legal_bits.append(f"APE : {co.ape_code}")
    line1 = company_parts
    if legal_bits:
        line1 += " - " + " - ".join(legal_bits)

    # Line 2: Contact
    contact_line = _join_parts([
        f"T\u00e9l : {co.phone}" if co.phone else "",
        co.website,
        co.email,
    ])

    # Line 3: Insurance / guarantee (Obat-style in footer)
    ins_parts: list[str] = []
    guarantee_map = {
        "decennale": "Garantie d\u00e9cennale",
        "biennale": "Garantie biennale",
        "rc": "Responsabilit\u00e9 civile",
    }
    if co.guarantee_type:
        ins_parts.append(guarantee_map.get(co.guarantee_type.lower(), co.guarantee_type))
    if co.insurance_name:
        ins_parts.append(co.insurance_name)
    ins_addr = _join_parts([
        co.insurance_address,
        _join_parts([co.insurance_zipcode, co.insurance_city], sep=" "),
    ])
    if ins_addr:
        ins_parts.append(ins_addr)
    if co.insurance_coverage:
        ins_parts.append(f"Couverture : {co.insurance_coverage}")

    lines = _clean_lines([
        line1,
        contact_line,
        _join_parts(ins_parts) if ins_parts else "",
    ])
    if not co.vat_subject:
        lines.append("TVA non applicable, art. 293 B du CGI")
    return lines


def _make_numbered_canvas(
    company: CompanyData,
    footer_text: str,
    reference: str,
) -> type:
    """Factory returning a Canvas subclass that draws footer + page numbering
    in a single reliable pass (avoids state-loss with the two-pass pattern)."""

    # Pre-compute footer lines once
    _footer_lines = _build_footer_lines(company, footer_text)
    _reference = reference

    class _NC(pdf_canvas.Canvas):
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            super().__init__(*args, **kwargs)
            self._saved_page_states: list[dict[str, Any]] = []

        def showPage(self) -> None:
            self._saved_page_states.append(dict(self.__dict__))
            self._startPage()  # type: ignore[attr-defined]

        def save(self) -> None:
            num_pages = len(self._saved_page_states)
            for i, state in enumerate(self._saved_page_states):
                self.__dict__.update(state)
                self._draw_footer(i + 1, num_pages)
                pdf_canvas.Canvas.showPage(self)
            pdf_canvas.Canvas.save(self)

        def _draw_footer(self, page_num: int, total_pages: int) -> None:
            self.saveState()

            # ── Separator line ──
            footer_line_y = 26 * mm
            self.setStrokeColor(C_BORDER)
            self.setLineWidth(0.5)
            self.line(MARGIN_L, footer_line_y, PAGE_W - MARGIN_R, footer_line_y)

            # ── Left: company info ──
            text_y = footer_line_y - 4 * mm
            text_w = USABLE_W - 30 * mm
            self.setFont("Helvetica", 6.5)
            self.setFillColor(C_MUTED)
            for line in _footer_lines:
                wrapped = simpleSplit(line, "Helvetica", 6.5, text_w)
                for wl in wrapped:
                    self.drawString(MARGIN_L, text_y, wl)
                    text_y -= 7

            # ── Right: reference + page number ──
            right_x = PAGE_W - MARGIN_R
            right_y = footer_line_y - 4 * mm
            if _reference:
                self.setFont("Helvetica", 7)
                self.setFillColor(C_TEXT)
                self.drawRightString(right_x, right_y, _reference)
                right_y -= 10

            self.setFont("Helvetica", 7)
            self.setFillColor(C_MUTED)
            self.drawRightString(right_x, right_y, f"Page {page_num} sur {total_pages}")

            self.restoreState()

    return _NC


# ---------------------------------------------------------------------------
# Générateur principal
# ---------------------------------------------------------------------------

class QuotePDFGenerator:
    """Génère un PDF de devis professionnel style Obat."""

    def __init__(self, data: QuoteData) -> None:
        if not HAS_REPORTLAB:
            raise ImportError("reportlab est requis. Installez-le : pip install reportlab")
        self.data = data
        # Parse company colors from visuals or use defaults
        import json as _json
        _vis: dict = {}
        try:
            _vis_raw = getattr(data.company, 'visuals_json', None)
            if _vis_raw:
                _vis = _json.loads(_vis_raw)
        except Exception:
            pass
        _pc = data.company.primary_color or _vis.get('primary', '#1E3A5F')
        _ac = data.company.accent_color or _vis.get('accent', '#2563EB')
        try:
            self._c_primary: Any = colors.HexColor(_pc)
        except Exception:
            self._c_primary = C_PRIMARY
        try:
            self._c_accent: Any = colors.HexColor(_ac)
        except Exception:
            self._c_accent = C_ACCENT
        self.styles = _build_styles(self._c_primary, self._c_accent)
        self._is_draft = data.status in ("draft", "brouillon", "")

    # ------------------------------------------------------------------
    # Point d'entrée
    # ------------------------------------------------------------------

    def generate(self) -> bytes:
        buffer = io.BytesIO()
        watermark_cb = _PageTemplate(self._is_draft)
        canvas_cls = _make_numbered_canvas(
            self.data.company,
            self.data.company.footer_text,
            self.data.reference,
        )

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=MARGIN_L,
            rightMargin=MARGIN_R,
            topMargin=MARGIN_T,
            bottomMargin=MARGIN_B + 14 * mm,
            onLaterPages=watermark_cb,
            onFirstPage=watermark_cb,
        )

        story: list[Any] = []
        story += self._build_header()
        story += self._build_addresses()
        story += self._build_subject_bar()
        story += self._build_line_items_table()
        story += self._build_totals_block()
        story += self._build_signature_block()
        story += self._build_notes_block()

        doc.build(story, canvasmaker=canvas_cls)
        return buffer.getvalue()

    # ------------------------------------------------------------------
    # Header : logo gauche / bloc devis droite
    # ------------------------------------------------------------------

    def _build_header(self) -> list[Any]:
        st = self.styles
        company = self.data.company

        # ---- Left: Logo (Obat style) ----
        logo = self._try_load_logo(company.logo_url)
        left_cell: Any = logo if logo else Spacer(1, 1)

        # ---- Right: Document title + metadata (Obat style) ----
        is_invoice = self.data.doc_type == "invoice"
        doc_title = "Facture" if is_invoice else "Devis"

        right_parts: list[Any] = [
            Paragraph(doc_title, st["doc_title"]),
        ]

        meta_lines: list[tuple[str, str]] = []
        if self.data.reference:
            meta_lines.append(("N°", self.data.reference))
        if self.data.quote_date:
            meta_lines.append(("En date du", self.data.quote_date))
        if self.data.expiry_date:
            label = "Échéance" if is_invoice else "Valable jusqu\u2019au"
            meta_lines.append((label, self.data.expiry_date))

        for lbl, val in meta_lines:
            right_parts.append(Paragraph(f"{lbl} : {val}", st["doc_label"]))

        right_stack = Table(
            [[p] for p in right_parts],
            colWidths=[USABLE_W * 0.5],
        )
        right_stack.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 1),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ]))

        header_table = Table(
            [[left_cell, right_stack]],
            colWidths=[USABLE_W * 0.5, USABLE_W * 0.5],
        )
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))

        result: list[Any] = [header_table]

        # Centered subtitle: work dates (Obat italic line)
        subtitle_parts: list[str] = []
        if self.data.work_start_date and not is_invoice:
            subtitle_parts.append(f"Début des travaux le : {self.data.work_start_date}")
        if self.data.estimated_duration and not is_invoice:
            subtitle_parts.append(f"Durée estimée à : {self.data.estimated_duration}")
        if subtitle_parts:
            result.append(Spacer(1, 2 * mm))
            result.append(Paragraph(
                f"<i>{' - '.join(subtitle_parts)}</i>",
                ParagraphStyle("subtitle", parent=st["company_muted"], alignment=TA_CENTER, fontSize=8),
            ))

        result.append(Spacer(1, 6 * mm))
        return result

    # ------------------------------------------------------------------
    # Bloc adresses (entreprise ↔ client + chantier)
    # ------------------------------------------------------------------

    def _build_addresses(self) -> list[Any]:
        st = self.styles
        company = self.data.company
        customer = self.data.customer

        # ---- Company info (left, plain text – Obat style) ----
        left_parts: list[Any] = []

        if company.header_text:
            lines = [l.strip() for l in company.header_text.split('\n') if l.strip()]
            if lines:
                left_parts.append(Paragraph(lines[0], st["company_name"]))
                for line in lines[1:]:
                    left_parts.append(Paragraph(line, st["company_detail"]))
        else:
            left_parts.append(Paragraph(company.name or "Votre entreprise", st["company_name"]))

            addr_lines: list[str] = []
            if company.address:
                addr_lines.append(company.address)
            city_line = " ".join(filter(None, [company.postal_code, company.city]))
            if city_line:
                addr_lines.append(city_line + " - France")
            for a_line in addr_lines:
                left_parts.append(Paragraph(a_line, st["company_detail"]))

            if company.vat_number and company.vat_subject:
                left_parts.append(Paragraph(f"TVA N° {company.vat_number}", st["company_detail"]))
            if company.phone:
                left_parts.append(Paragraph(f"Tél : {company.phone}", st["company_detail"]))
            if company.email:
                left_parts.append(Paragraph(f"Email : {company.email}", st["company_detail"]))
            if company.website:
                left_parts.append(Paragraph(company.website, st["company_muted"]))

        # ---- Customer info (right, soft card – Obat style) ----
        right_parts: list[Any] = []
        cust_name = customer.name or "—"
        right_parts.append(Paragraph(cust_name, st["address_name"]))
        if customer.contact_name and customer.contact_name != cust_name:
            right_parts.append(Paragraph(customer.contact_name, st["address_detail"]))
        if customer.address:
            right_parts.append(Paragraph(customer.address, st["address_detail"]))
        cust_city = " ".join(filter(None, [customer.postal_code, customer.city]))
        if cust_city:
            right_parts.append(Paragraph(cust_city, st["address_detail"]))
        right_parts.append(Paragraph(customer.country or "France", st["address_detail"]))
        if customer.siret:
            right_parts.append(Paragraph(f"SIRET : {customer.siret}", st["company_muted"]))
        if customer.vat:
            right_parts.append(Paragraph(f"TVA : {customer.vat}", st["company_muted"]))

        left_w = USABLE_W * 0.48
        right_w = USABLE_W * 0.48
        gap_w = USABLE_W * 0.04

        left_table = Table([[p] for p in left_parts], colWidths=[left_w])
        left_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 1),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ]))

        right_table = Table([[p] for p in right_parts], colWidths=[right_w - 8 * mm])
        right_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), C_SURFACE),
            ("BOX", (0, 0), (-1, -1), 0.4, C_SOFT),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
            ("TOPPADDING", (0, 0), (0, 0), 4 * mm),
            ("TOPPADDING", (0, 1), (-1, -1), 1),
            ("BOTTOMPADDING", (0, 0), (-1, -2), 1),
            ("BOTTOMPADDING", (0, -1), (-1, -1), 4 * mm),
        ]))

        addr_row = Table(
            [[left_table, Spacer(gap_w, 1), right_table]],
            colWidths=[left_w, gap_w, right_w],
        )
        addr_row.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))

        hr = HRFlowable(width="100%", thickness=0.5, color=C_SOFT, spaceBefore=5 * mm, spaceAfter=4 * mm)
        return [addr_row, hr]

    # ------------------------------------------------------------------
    # Barre objet
    # ------------------------------------------------------------------

    def _build_subject_bar(self) -> list[Any]:
        if not self.data.subject:
            return [Spacer(1, 2 * mm)]
        st = self.styles
        return [
            Paragraph(self.data.subject, st["subject"]),
            Spacer(1, 4 * mm),
        ]

    # ------------------------------------------------------------------
    # Tableau des lignes
    # ------------------------------------------------------------------

    def _build_line_items_table(self) -> list[Any]:
        st = self.styles
        items = self.data.line_items

        if not items:
            return [Paragraph("Aucune ligne.", st["company_muted"]), Spacer(1, 4 * mm)]

        # 6 columns matching Obat: N°, DÉSIGNATION, QTÉ, PRIX U., TVA, TOTAL HT
        des_w = USABLE_W - 10 * mm - 18 * mm - 24 * mm - 18 * mm - 24 * mm
        col_widths = [10 * mm, des_w, 18 * mm, 24 * mm, 18 * mm, 24 * mm]

        h_style = ParagraphStyle("th", parent=st["cell_num"], textColor=C_WHITE, fontName="Helvetica-Bold")
        header_row = [
            Paragraph("N°", ParagraphStyle("th0", parent=h_style, alignment=TA_CENTER)),
            Paragraph("DÉSIGNATION", ParagraphStyle("th1", parent=h_style, alignment=TA_LEFT)),
            Paragraph("QTÉ", ParagraphStyle("th2", parent=h_style)),
            Paragraph("PRIX U.", ParagraphStyle("th3", parent=h_style)),
            Paragraph("TVA", ParagraphStyle("th4", parent=h_style)),
            Paragraph("TOTAL HT", ParagraphStyle("th5", parent=h_style)),
        ]

        table_data: list[list[Any]] = [header_row]
        table_styles: list[Any] = [
            ("BACKGROUND", (0, 0), (-1, 0), self._c_primary),
            ("TEXTCOLOR", (0, 0), (-1, 0), C_WHITE),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8.5),
            ("TOPPADDING", (0, 0), (-1, 0), 3 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 3 * mm),
            ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2 * mm),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOX", (0, 0), (-1, -1), 0.5, C_SOFT),
            ("LINEBELOW", (0, 0), (-1, -1), 0.3, C_SOFT),
        ]

        item_num = 0
        row_idx = 1

        # Group by section
        sections: dict[str, list[LineItemData]] = {}
        for item in items:
            sec = item.section or ""
            if sec not in sections:
                sections[sec] = []
            sections[sec].append(item)

        all_groups: list[tuple[str, list[LineItemData]]] = []
        no_section = sections.pop("", [])
        if no_section:
            all_groups.append(("", no_section))
        for sec, grp in sections.items():
            all_groups.append((sec, grp))

        for section_name, grp_items in all_groups:
            if section_name:
                sec_row: list[Any] = [
                    Paragraph(f"<b>{section_name}</b>", st["section_header"]),
                    "", "", "", "", "",
                ]
                table_data.append(sec_row)
                table_styles.append(("BACKGROUND", (0, row_idx), (-1, row_idx), C_LIGHT))
                table_styles.append(("SPAN", (0, row_idx), (-1, row_idx)))
                table_styles.append(("LEFTPADDING", (0, row_idx), (-1, row_idx), 4 * mm))
                table_styles.append(("TOPPADDING", (0, row_idx), (-1, row_idx), 2.5 * mm))
                table_styles.append(("BOTTOMPADDING", (0, row_idx), (-1, row_idx), 2.5 * mm))
                row_idx += 1

            for item in grp_items:
                item_num += 1
                bg = C_WHITE if item_num % 2 == 1 else colors.HexColor("#F9FAFB")

                # Designation cell with long description
                des_parts: list[Any] = [Paragraph(item.designation or "—", st["cell_designation"])]
                if item.long_description:
                    des_parts.append(Paragraph(item.long_description, st["cell_desc"]))
                if item.reference:
                    des_parts.append(Paragraph(f"Réf : {item.reference}", st["cell_desc"]))

                # QTÉ: combine quantity + unit (Obat style: "1,00 u")
                qty_text = f"{_fmt_qty(item.quantity)} {item.unit or 'u'}"

                row: list[Any] = [
                    Paragraph(str(item_num), ParagraphStyle("n", parent=st["cell_num"], alignment=TA_CENTER)),
                    des_parts,
                    Paragraph(qty_text, st["cell_num"]),
                    Paragraph(_fmt_euro(item.unit_price), st["cell_num"]),
                    Paragraph(_fmt_pct(item.tax_rate), st["cell_num"]),
                    Paragraph(_fmt_euro(item.total_ht), ParagraphStyle("ht", parent=st["cell_num"], fontName="Helvetica-Bold")),
                ]
                table_data.append(row)
                table_styles.append(("BACKGROUND", (0, row_idx), (-1, row_idx), bg))
                table_styles.append(("TOPPADDING", (0, row_idx), (-1, row_idx), 3 * mm))
                table_styles.append(("BOTTOMPADDING", (0, row_idx), (-1, row_idx), 3 * mm))
                row_idx += 1

        table = Table(table_data, colWidths=col_widths, repeatRows=1)
        table.setStyle(TableStyle(table_styles))

        return [table, Spacer(1, 6 * mm)]

    # ------------------------------------------------------------------
    # Bloc totaux
    # ------------------------------------------------------------------

    def _build_totals_block(self) -> list[Any]:
        st = self.styles
        items = self.data.line_items

        total_ht_raw = sum(i.total_ht for i in items)
        discount_amount = total_ht_raw * (self.data.global_discount_percent / 100)
        total_ht_net = total_ht_raw - discount_amount

        tva_recap: dict[float, float] = {}
        for item in items:
            rate = item.tax_rate
            tva_recap[rate] = tva_recap.get(rate, 0.0) + item.total_tva

        total_tva = sum(tva_recap.values())
        total_ttc = total_ht_net + total_tva

        cee = self.data.cee_premium
        mpr = self.data.mpr_premium
        waste = self.data.waste_management_fee
        net_a_payer = total_ttc - cee - mpr + waste
        deposit_amount = net_a_payer * (self.data.deposit_percent / 100)

        # ---- Left column: Conditions de paiement (Obat style) ----
        left_parts: list[Any] = []
        has_conditions = bool(self.data.conditions or self.data.payment_terms)

        if has_conditions:
            left_parts.append(Paragraph("<b>Conditions de paiement</b>", st["address_name"]))
            left_parts.append(Spacer(1, 2 * mm))
            if self.data.conditions:
                left_parts.append(Paragraph(
                    self.data.conditions.replace("\n", "<br/>"),
                    ParagraphStyle("cond", parent=st["company_detail"], fontSize=7.5, leading=9),
                ))
            if self.data.payment_terms:
                left_parts.append(Spacer(1, 2 * mm))
                left_parts.append(Paragraph(
                    self.data.payment_terms.replace("\n", "<br/>"),
                    ParagraphStyle("pt_cond", parent=st["company_detail"], fontSize=7.5, leading=9),
                ))
            if cee:
                left_parts.append(Paragraph("* sous condition de l\u2019acceptation de CEE", st["company_muted"]))
            if mpr:
                left_parts.append(Paragraph("** sous condition de l\u2019acceptation de MPR", st["company_muted"]))

        # ---- Right column: Totals table (Obat style) ----
        def _t_row(lbl: str, val: str, bold: bool = False, color: Any = None) -> list[Any]:
            ls = st["total_label_bold"] if bold else st["total_label"]
            vs = st["total_value_bold"] if bold else st["total_value"]
            if color:
                ls = ParagraphStyle(f"tl_{lbl}", parent=ls, textColor=color)
                vs = ParagraphStyle(f"tv_{lbl}", parent=vs, textColor=color)
            return [Paragraph(lbl, ls), Paragraph(val, vs)]

        totals_rows: list[list[Any]] = []
        if discount_amount:
            totals_rows.append(_t_row("Total HT brut", _fmt_euro(total_ht_raw)))
            totals_rows.append(_t_row(
                f"Remise ({_fmt_pct(self.data.global_discount_percent)})",
                f"- {_fmt_euro(discount_amount)}",
                color=self._c_accent,
            ))
        totals_rows.append(_t_row("Total net HT", _fmt_euro(total_ht_net), bold=not discount_amount))

        for rate in sorted(tva_recap.keys()):
            totals_rows.append(_t_row(f"TVA {_fmt_pct(rate)}", _fmt_euro(tva_recap[rate])))

        totals_rows.append(_t_row("Total TTC", _fmt_euro(total_ttc + waste), bold=True))

        if cee:
            totals_rows.append(_t_row("Prime CEE *", f"- {_fmt_euro(cee)}", color=C_GREEN))
        if mpr:
            totals_rows.append(_t_row("Prime MaPrimeRénov\u2019 **", f"- {_fmt_euro(mpr)}", color=C_GREEN))

        if self.data.deposit_percent:
            totals_rows.append(_t_row(
                f"Acompte ({_fmt_pct(self.data.deposit_percent)})",
                _fmt_euro(deposit_amount),
                color=self._c_accent,
            ))

        # NET À PAYER highlighted row (Obat blue bar)
        nap_row = [
            Paragraph("NET À PAYER", st["total_ttc_label"]),
            Paragraph(_fmt_euro(net_a_payer), st["total_ttc_value"]),
        ]

        right_w = 95 * mm
        totals_table = Table(totals_rows, colWidths=[right_w - 35 * mm, 35 * mm])
        totals_table.setStyle(TableStyle([
            ("LINEBELOW", (0, 0), (-1, -1), 0.3, C_SOFT),
            ("TOPPADDING", (0, 0), (-1, -1), 2 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm),
            ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
            ("BOX", (0, 0), (-1, -1), 0.5, C_SOFT),
        ]))

        nap_table = Table([nap_row], colWidths=[right_w - 35 * mm, 35 * mm])
        nap_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), self._c_primary),
            ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
            ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
        ]))

        right_stack = Table(
            [[totals_table], [nap_table]],
            colWidths=[right_w],
        )
        right_stack.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))

        # Assemble: conditions left + totals right (Obat layout)
        left_w = USABLE_W - right_w - 6 * mm
        if has_conditions:
            left_table = Table([[p] for p in left_parts], colWidths=[left_w])
            left_table.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ]))
            final = Table(
                [[left_table, Spacer(6 * mm, 1), right_stack]],
                colWidths=[left_w, 6 * mm, right_w],
            )
        else:
            final = Table(
                [[Spacer(left_w + 6 * mm, 1), right_stack]],
                colWidths=[left_w + 6 * mm, right_w],
            )

        final.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))

        return [KeepTogether([final]), Spacer(1, 8 * mm)]

    # ------------------------------------------------------------------
    # Bloc signature "Bon pour accord"
    # ------------------------------------------------------------------

    def _build_signature_block(self) -> list[Any]:
        st = self.styles

        if self.data.doc_type == "invoice":
            # Invoice: just payment conditions
            parts: list[Any] = []
            if self.data.payment_terms:
                parts.append(Paragraph("<b>Conditions de règlement</b>", st["address_name"]))
                parts.append(Spacer(1, 2 * mm))
                parts.append(Paragraph(self.data.payment_terms, ParagraphStyle("pt_inv", parent=st["company_detail"], alignment=TA_LEFT)))
            bank_text = self.data.bank_details or (f"IBAN : {self.data.company.iban}" if self.data.company.iban else "")
            if bank_text:
                parts.append(Spacer(1, 2 * mm))
                parts.append(Paragraph(bank_text, ParagraphStyle("bt_inv", parent=st["company_muted"], alignment=TA_LEFT)))
            if self.data.company.bic:
                parts.append(Paragraph(f"BIC : {self.data.company.bic}", ParagraphStyle("bic_inv", parent=st["company_muted"], alignment=TA_LEFT)))
            if not parts:
                return []
            rows = [[p] for p in parts]
            tbl = Table(rows, colWidths=[USABLE_W])
            tbl.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ]))
            return [tbl, Spacer(1, 6 * mm)]

        # ---- Quote: waste left + signature right (Obat style) ----
        col_w = USABLE_W / 2 - 6 * mm

        # Left: Waste management (if any)
        left_parts: list[Any] = []
        if self.data.waste_management_fee:
            left_parts.append(Paragraph("<b>Gestion des déchets</b>", st["address_name"]))
            left_parts.append(Spacer(1, 2 * mm))
            left_parts.append(Paragraph(
                f"Coûts associés de {_fmt_euro(self.data.waste_management_fee)} TTC",
                st["company_detail"],
            ))

        # Right: Signature box (Obat "Pour le client" style)
        sign_parts: list[Any] = [
            Paragraph("<b>Pour le client</b>", ParagraphStyle("sign_h", parent=st["address_name"], alignment=TA_LEFT)),
            Spacer(1, 3 * mm),
            Paragraph(
                'Mention "Reçu avant l\u2019exécution des travaux, bon pour accord", date et signature',
                ParagraphStyle("sign_inst", parent=st["company_detail"], fontSize=8, leading=10),
            ),
            Spacer(1, 18 * mm),
            Paragraph("...... / ...... / ..............", st["company_muted"]),
        ]

        sign_table = Table([[p] for p in sign_parts], colWidths=[col_w])
        sign_table.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, C_SOFT),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
            ("TOPPADDING", (0, 0), (0, 0), 4 * mm),
            ("TOPPADDING", (0, 1), (-1, -1), 1),
            ("BOTTOMPADDING", (0, 0), (-1, -2), 1),
            ("BOTTOMPADDING", (0, -1), (-1, -1), 4 * mm),
        ]))

        if left_parts:
            left_table = Table([[p] for p in left_parts], colWidths=[col_w])
            left_table.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ]))
            row = Table(
                [[left_table, Spacer(12 * mm, 1), sign_table]],
                colWidths=[col_w, 12 * mm, col_w],
            )
        else:
            row = Table(
                [[Spacer(col_w + 12 * mm, 1), sign_table]],
                colWidths=[col_w + 12 * mm, col_w],
            )

        row.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))

        return [KeepTogether([row]), Spacer(1, 6 * mm)]

    # ------------------------------------------------------------------
    # Bloc notes / CGV / mentions légales
    # ------------------------------------------------------------------

    def _build_notes_block(self) -> list[Any]:
        st = self.styles
        company = self.data.company
        parts: list[Any] = []

        # Notes
        if self.data.notes:
            parts.append(Paragraph("<b>Notes</b>", st["address_name"]))
            parts.append(Spacer(1, 2 * mm))
            parts.append(Paragraph(self.data.notes.replace("\n", "<br/>"), st["company_detail"]))
            parts.append(Spacer(1, 2 * mm))

        # Bank details (Obat shows these under Notes)
        if company.iban or company.bic:
            if not self.data.notes:
                parts.append(Paragraph("<b>Notes</b>", st["address_name"]))
                parts.append(Spacer(1, 2 * mm))
            bank_lines: list[str] = [f"Titulaire du compte <b>{company.name}</b>"]
            if company.iban:
                bank_lines.append(f"IBAN {company.iban}")
            if company.bic:
                bank_lines.append(f"BIC {company.bic}")
            parts.append(Paragraph("<br/>".join(bank_lines), st["company_detail"]))
            parts.append(Spacer(1, 3 * mm))

        # Legal mentions
        if self.data.legal_mentions:
            parts.append(Paragraph("<b>Mentions légales</b>", st["address_name"]))
            parts.append(Spacer(1, 2 * mm))
            parts.append(Paragraph(
                self.data.legal_mentions.replace("\n", "<br/>"),
                ParagraphStyle("legal", parent=st["company_muted"], fontSize=7, leading=8.5),
            ))

        if not parts:
            return []

        table = Table([[p] for p in parts], colWidths=[USABLE_W])
        table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))

        return [table]

    # ------------------------------------------------------------------
    # Chargement logo
    # ------------------------------------------------------------------

    @staticmethod
    def _try_load_logo(url: str) -> Optional[Image]:
        if not url:
            return None

        def _scale(img: Image) -> Image:
            max_w = 45 * mm
            max_h = 25 * mm
            iw, ih = img.imageWidth, img.imageHeight
            ratio = min(max_w / iw, max_h / ih)
            img.drawWidth = iw * ratio
            img.drawHeight = ih * ratio
            return img

        # Try filesystem first (handles relative /static/uploads/... paths)
        try:
            if url.startswith('/'):
                import os as _os
                local_path = _os.path.join(_os.getcwd(), url.lstrip('/'))
                if _os.path.isfile(local_path):
                    return _scale(Image(local_path))
        except Exception:
            pass

        # Fallback: HTTP fetch for absolute URLs
        try:
            import requests  # type: ignore
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                buf = io.BytesIO(resp.content)
                return _scale(Image(buf))
        except Exception:
            pass
        return None


# ---------------------------------------------------------------------------
# Fonction utilitaire publique
# ---------------------------------------------------------------------------

def generate_quote_pdf(data: QuoteData) -> bytes:
    """Génère et retourne les bytes du PDF pour un devis."""
    return QuotePDFGenerator(data).generate()


def generate_invoice_pdf(data: QuoteData) -> bytes:
    """Génère et retourne les bytes du PDF pour une facture."""
    data.doc_type = "invoice"
    return QuotePDFGenerator(data).generate()
