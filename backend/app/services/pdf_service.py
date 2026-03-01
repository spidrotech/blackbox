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
    from reportlab.lib.utils import ImageReader
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


@dataclass
class QuoteData:
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
    """Canvas callback : numérotation + footer + filigrane BROUILLON."""

    def __init__(self, company: CompanyData, is_draft: bool, footer_text: str) -> None:
        self.company = company
        self.is_draft = is_draft
        self.footer_text = footer_text

    def __call__(self, canvas: Any, doc: Any) -> None:
        canvas.saveState()

        # Filigrane BROUILLON en diagonale
        if self.is_draft:
            canvas.setFont("Helvetica-Bold", 70)
            canvas.setFillColor(colors.HexColor("#F1F5F9"))
            canvas.translate(PAGE_W / 2, PAGE_H / 2)
            canvas.rotate(45)
            canvas.drawCentredString(0, 0, "BROUILLON")
            canvas.rotate(-45)
            canvas.translate(-PAGE_W / 2, -PAGE_H / 2)

        # Ligne séparatrice footer
        canvas.setStrokeColor(C_BORDER)
        canvas.setLineWidth(0.5)
        canvas.line(MARGIN_L, MARGIN_B - 2 * mm, PAGE_W - MARGIN_R, MARGIN_B - 2 * mm)

        # Footer gauche : mentions légales complètes (style Obat)
        canvas.setFont("Helvetica", 6.5)
        canvas.setFillColor(C_MUTED)
        co = self.company
        legal_parts = [co.name] if co.name else []
        if co.siret:
            legal_parts.append(f"SIRET : {co.siret}")
        if co.vat_number and co.vat_subject:
            legal_parts.append(f"TVA : {co.vat_number}")
        if co.rcs_city:
            legal_parts.append(f"RCS {co.rcs_city}")
        if co.rm_number:
            legal_parts.append(f"RM {co.rm_number}")
        if co.capital:
            legal_parts.append(f"Capital {int(co.capital):,} €".replace(",", "\u202f"))
        if co.ape_code:
            legal_parts.append(f"APE {co.ape_code}")
        # Custom footer text overrides or appends
        if self.footer_text and self.footer_text != co.name:
            legal_parts.append(self.footer_text)
        footer_line = "  ·  ".join(legal_parts)
        canvas.drawString(MARGIN_L, MARGIN_B - 6 * mm, footer_line)

        # Footer droite : numéro de page
        page_str = f"Page {doc.page}"
        canvas.drawRightString(PAGE_W - MARGIN_R, MARGIN_B - 6 * mm, page_str)

        canvas.restoreState()


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
        template_cb = _PageTemplate(
            self.data.company,
            self._is_draft,
            self.data.company.footer_text,
        )

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=MARGIN_L,
            rightMargin=MARGIN_R,
            topMargin=MARGIN_T,
            bottomMargin=MARGIN_B + 8 * mm,
            onLaterPages=template_cb,
            onFirstPage=template_cb,
        )

        story: list[Any] = []
        story += self._build_header()
        story += self._build_addresses()
        story += self._build_subject_bar()
        story += self._build_line_items_table()
        story += self._build_totals_block()
        story += self._build_signature_block()
        story += self._build_notes_block()

        doc.build(story)
        return buffer.getvalue()

    # ------------------------------------------------------------------
    # Header : logo gauche / bloc devis droite
    # ------------------------------------------------------------------

    def _build_header(self) -> list[Any]:
        st = self.styles
        company = self.data.company

        # ---- Colonne gauche : logo + infos société ----
        left_parts: list[Any] = []

        logo = self._try_load_logo(company.logo_url)
        if logo:
            left_parts.append(logo)
            left_parts.append(Spacer(1, 3 * mm))

        left_parts.append(Paragraph(company.name or "Votre entreprise", st["company_name"]))

        addr_parts = []
        if company.address:
            addr_parts.append(company.address)
        city_line = " ".join(filter(None, [company.postal_code, company.city]))
        if city_line:
            addr_parts.append(city_line)
        if company.country and company.country != "France":
            addr_parts.append(company.country)
        if addr_parts:
            left_parts.append(Paragraph("<br/>".join(addr_parts), st["company_detail"]))

        contact_parts = []
        if company.phone:
            contact_parts.append(f"Tél : {company.phone}")
        if company.email:
            contact_parts.append(f"Email : {company.email}")
        if company.website:
            contact_parts.append(company.website)
        if contact_parts:
            left_parts.append(Paragraph("  ·  ".join(contact_parts), st["company_muted"]))

        legal_parts = []
        if company.siret:
            legal_parts.append(f"SIRET : {company.siret}")
        if company.vat_number and company.vat_subject:
            legal_parts.append(f"TVA : {company.vat_number}")
        if legal_parts:
            left_parts.append(Paragraph("  ─  ".join(legal_parts), st["company_muted"]))

        rcs_parts = []
        if company.rcs_city:
            rcs_parts.append(f"RCS {company.rcs_city}")
        if company.rm_number:
            rcs_parts.append(f"RM {company.rm_number}")
        if company.capital:
            rcs_parts.append(f"Capital {int(company.capital):,} €".replace(",", " "))
        if company.ape_code:
            rcs_parts.append(f"APE {company.ape_code}")
        if rcs_parts:
            left_parts.append(Paragraph("  ─  ".join(rcs_parts), st["company_muted"]))

        # ---- Colonne droite : DEVIS + ref + dates ----
        right_parts: list[Any] = [
            Paragraph("DEVIS", st["doc_title"]),
            Spacer(1, 2 * mm),
            Paragraph(self.data.reference or "—", st["doc_ref"]),
            Spacer(1, 3 * mm),
        ]

        date_rows = [
            ("Date du devis :", self.data.quote_date),
            ("Valable jusqu'au :", self.data.expiry_date),
        ]
        if self.data.work_start_date:
            date_rows.append(("Début des travaux :", self.data.work_start_date))
        if self.data.estimated_duration:
            date_rows.append(("Durée estimée :", self.data.estimated_duration))

        for lbl, val in date_rows:
            right_parts.append(
                Table(
                    [[Paragraph(lbl, st["doc_label"]), Paragraph(str(val), st["doc_value"])]],
                    colWidths=[30 * mm, 35 * mm],
                    style=TableStyle([
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 0),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                        ("TOPPADDING", (0, 0), (-1, -1), 1),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
                    ]),
                )
            )

        # ---- Badge statut ----
        if self._is_draft:
            badge_color = colors.HexColor("#F59E0B")
            badge_text = "BROUILLON"
        elif self.data.status == "sent":
            badge_color = self._c_accent
            badge_text = "ENVOYÉ"
        elif self.data.status in ("accepted", "signed"):
            badge_color = C_GREEN
            badge_text = "ACCEPTÉ"
        else:
            badge_color = C_MUTED
            badge_text = self.data.status.upper()

        badge_style = ParagraphStyle(
            "badge",
            parent=self.styles["doc_ref"],
            textColor=C_WHITE,
            backColor=badge_color,
            borderPadding=(3, 6, 3, 6),
            borderRadius=4,
            alignment=TA_CENTER,
        )
        right_parts.append(Spacer(1, 2 * mm))
        right_parts.append(Paragraph(badge_text, badge_style))

        # ---- Assemblage en tableau 2 colonnes ----
        left_w = USABLE_W * 0.55
        right_w = USABLE_W * 0.45

        def _stack(parts: list[Any]) -> Table:
            data_rows = [[p] for p in parts]
            t = Table(data_rows, colWidths=[left_w])
            t.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]))
            return t

        def _stack_r(parts: list[Any]) -> Table:
            data_rows = [[p] for p in parts]
            t = Table(data_rows, colWidths=[right_w])
            t.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]))
            return t

        header_table = Table(
            [[_stack(left_parts), _stack_r(right_parts)]],
            colWidths=[left_w, right_w],
        )
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))

        # Ligne de séparation sous le header
        hr = HRFlowable(width="100%", thickness=2, color=self._c_primary, spaceAfter=6 * mm, spaceBefore=4 * mm)

        return [header_table, hr]

    # ------------------------------------------------------------------
    # Bloc adresses (entreprise ↔ client + chantier)
    # ------------------------------------------------------------------

    def _build_addresses(self) -> list[Any]:
        st = self.styles
        customer = self.data.customer

        def _addr_block(title: str, name: str, lines: list[str]) -> Table:
            content: list[Any] = [
                Paragraph(title, st["block_title"]),
                Paragraph(name, st["address_name"]),
            ]
            for line in lines:
                if line.strip():
                    content.append(Paragraph(line, st["address_detail"]))
            data_rows = [[p] for p in content]
            t = Table(data_rows, colWidths=[USABLE_W / 3 - 4 * mm])
            t.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ]))
            return t

        # Client
        customer_lines = []
        if customer.contact_name:
            customer_lines.append(customer.contact_name)
        city_line = " ".join(filter(None, [customer.postal_code, customer.city]))
        if customer.address:
            customer_lines.append(customer.address)
        if city_line:
            customer_lines.append(city_line)
        if customer.phone:
            customer_lines.append(f"Tél : {customer.phone}")
        if customer.email:
            customer_lines.append(customer.email)

        client_block = _addr_block("DESTINATAIRE", customer.name or "—", customer_lines)

        # Chantier
        chantier_block = None
        if self.data.worksite_address:
            chantier_lines = [self.data.worksite_address]
            if self.data.work_start_date:
                chantier_lines.append(f"Début : {self.data.work_start_date}")
            if self.data.estimated_duration:
                chantier_lines.append(f"Durée : {self.data.estimated_duration}")
            chantier_block = _addr_block("LIEU DES TRAVAUX", "", chantier_lines)

        col_w = USABLE_W / 3

        if chantier_block:
            row = [[Spacer(col_w, 1), client_block, chantier_block]]
            col_widths = [col_w, col_w, col_w]
        else:
            row = [[Spacer(col_w + 12 * mm, 1), client_block]]
            col_widths = [col_w + 12 * mm, col_w * 2 - 12 * mm]

        addr_table = Table(row, colWidths=col_widths)
        addr_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6 * mm),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))

        return [addr_table, Spacer(1, 6 * mm)]

    # ------------------------------------------------------------------
    # Barre objet
    # ------------------------------------------------------------------

    def _build_subject_bar(self) -> list[Any]:
        if not self.data.subject:
            return [Spacer(1, 2 * mm)]
        st = self.styles
        subject_text = f"Objet : {self.data.subject}"
        bar = Table(
            [[Paragraph(subject_text, st["subject"])]],
            colWidths=[USABLE_W],
        )
        bar.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), C_LIGHT),
            ("LEFTPADDING", (0, 0), (-1, -1), 6 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6 * mm),
            ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
            ("BOX", (0, 0), (-1, -1), 0.5, C_BORDER),
            ("ROUNDEDCORNERS", [4, 4, 4, 4]),
        ]))
        return [bar, Spacer(1, 5 * mm)]

    # ------------------------------------------------------------------
    # Tableau des lignes
    # ------------------------------------------------------------------

    def _build_line_items_table(self) -> list[Any]:
        st = self.styles
        items = self.data.line_items

        if not items:
            return [Paragraph("Aucune ligne.", st["company_muted"]), Spacer(1, 4 * mm)]

        # Largeurs colonnes
        col_widths = [
            10 * mm,    # N°
            USABLE_W * 0.38,  # Désignation
            14 * mm,    # Qté
            12 * mm,    # Unité
            22 * mm,    # P.U. HT
            18 * mm,    # Remise %
            22 * mm,    # TVA %
            24 * mm,    # Total HT
        ]

        # En-tête
        header_row = [
            Paragraph("N°", ParagraphStyle("ch", parent=st["cell_num"], textColor=C_WHITE, alignment=TA_CENTER)),
            Paragraph("Désignation", ParagraphStyle("ch2", parent=st["cell_designation"], textColor=C_WHITE, fontName="Helvetica-Bold")),
            Paragraph("Qté", ParagraphStyle("ch3", parent=st["cell_num"], textColor=C_WHITE)),
            Paragraph("Unité", ParagraphStyle("ch4", parent=st["cell_num"], textColor=C_WHITE)),
            Paragraph("P.U. HT", ParagraphStyle("ch5", parent=st["cell_num"], textColor=C_WHITE)),
            Paragraph("Remise", ParagraphStyle("ch6", parent=st["cell_num"], textColor=C_WHITE)),
            Paragraph("TVA", ParagraphStyle("ch7", parent=st["cell_num"], textColor=C_WHITE)),
            Paragraph("Total HT", ParagraphStyle("ch8", parent=st["cell_num"], textColor=C_WHITE)),
        ]

        table_data: list[list[Any]] = [header_row]
        table_styles: list[Any] = [
            # En-tête
            ("BACKGROUND", (0, 0), (-1, 0), self._c_primary),
            ("TEXTCOLOR", (0, 0), (-1, 0), C_WHITE),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8.5),
            ("TOPPADDING", (0, 0), (-1, 0), 4 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 4 * mm),
            ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2 * mm),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            # Grille globale
            ("LINEBELOW", (0, 0), (-1, -1), 0.3, C_BORDER),
            ("LINEAFTER", (1, 1), (-2, -1), 0.2, C_BORDER),
        ]

        current_section = None
        item_num = 0
        row_idx = 1  # 0 = header

        # Regroupement par section
        from itertools import groupby
        sections: dict[str, list[tuple[int, LineItemData]]] = {}
        for item in items:
            sec = item.section or ""
            if sec not in sections:
                sections[sec] = []
            sections[sec].append(item)

        # Rendu sans section d'abord, puis avec sections
        all_groups: list[tuple[str, list[LineItemData]]] = []
        no_section = sections.pop("", [])
        if no_section:
            all_groups.append(("", no_section))
        for sec, grp in sections.items():
            all_groups.append((sec, grp))

        for section_name, grp_items in all_groups:
            if section_name:
                # En-tête de section
                sec_row: list[Any] = [
                    Paragraph(section_name, st["section_header"]),
                    "", "", "", "", "", "", "",
                ]
                table_data.append(sec_row)
                table_styles.append(("BACKGROUND", (0, row_idx), (-1, row_idx), C_SECTION))
                table_styles.append(("SPAN", (0, row_idx), (-1, row_idx)))
                table_styles.append(("LEFTPADDING", (0, row_idx), (-1, row_idx), 4 * mm))
                table_styles.append(("TOPPADDING", (0, row_idx), (-1, row_idx), 3 * mm))
                table_styles.append(("BOTTOMPADDING", (0, row_idx), (-1, row_idx), 3 * mm))
                row_idx += 1

            for item in grp_items:
                item_num += 1
                bg = C_WHITE if item_num % 2 == 1 else colors.HexColor("#FAFBFF")

                # Cellule désignation + description longue
                designation_content: list[Any] = [Paragraph(item.designation or "—", st["cell_designation"])]
                if item.long_description:
                    designation_content.append(Paragraph(item.long_description, st["cell_desc"]))
                if item.reference:
                    designation_content.append(Paragraph(f"Réf : {item.reference}", st["cell_desc"]))

                row: list[Any] = [
                    Paragraph(str(item_num), ParagraphStyle("num_c", parent=st["cell_num"], alignment=TA_CENTER)),
                    designation_content,
                    Paragraph(_fmt_qty(item.quantity), st["cell_num"]),
                    Paragraph(item.unit or "u", ParagraphStyle("unit_c", parent=st["cell_num"], alignment=TA_LEFT)),
                    Paragraph(_fmt_euro(item.unit_price), st["cell_num"]),
                    Paragraph(_fmt_pct(item.discount_percent) if item.discount_percent else "—", st["cell_num"]),
                    Paragraph(_fmt_pct(item.tax_rate), st["cell_num"]),
                    Paragraph(_fmt_euro(item.total_ht), ParagraphStyle("total_ht_c", parent=st["cell_num"], fontName="Helvetica-Bold")),
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
        total_tva_raw = sum(i.total_tva for i in items)

        # Remise globale
        discount_amount = total_ht_raw * (self.data.global_discount_percent / 100)
        total_ht_net = total_ht_raw - discount_amount

        # Récapitulatif TVA par taux
        tva_recap: dict[float, float] = {}
        for item in items:
            rate = item.tax_rate
            tva_recap[rate] = tva_recap.get(rate, 0.0) + item.total_tva

        total_tva = sum(tva_recap.values())
        total_ttc = total_ht_net + total_tva

        # Primes / Frais
        cee = self.data.cee_premium
        mpr = self.data.mpr_premium
        waste = self.data.waste_management_fee
        total_premiums = cee + mpr
        net_a_payer = total_ttc - total_premiums + waste

        deposit_amount = net_a_payer * (self.data.deposit_percent / 100)

        # ---- Tableau récapitulatif TVA (à gauche) ----
        tva_rows: list[list[Any]] = [
            [
                Paragraph("Récapitulatif TVA", ParagraphStyle("tva_h", parent=st["total_label_bold"], textColor=C_MUTED, fontSize=7.5)),
                Paragraph("Base HT", ParagraphStyle("tva_h2", parent=st["total_value"], textColor=C_MUTED, fontSize=7.5)),
                Paragraph("Montant TVA", ParagraphStyle("tva_h3", parent=st["total_value"], textColor=C_MUTED, fontSize=7.5)),
            ]
        ]
        for rate in sorted(tva_recap.keys()):
            base_ht = sum(i.total_ht for i in items if i.tax_rate == rate)
            tva_rows.append([
                Paragraph(f"TVA {_fmt_pct(rate)}", st["total_label"]),
                Paragraph(_fmt_euro(base_ht), st["total_value"]),
                Paragraph(_fmt_euro(tva_recap[rate]), st["total_value"]),
            ])
        tva_rows.append([
            Paragraph("Total TVA", st["total_label_bold"]),
            Paragraph("", st["total_value"]),
            Paragraph(_fmt_euro(total_tva), st["total_value_bold"]),
        ])

        tva_table = Table(tva_rows, colWidths=[30 * mm, 28 * mm, 30 * mm])
        tva_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), C_LIGHT),
            ("LINEBELOW", (0, 0), (-1, -1), 0.3, C_BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 2 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm),
            ("LEFTPADDING", (0, 0), (-1, -1), 2 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2 * mm),
            ("BOX", (0, 0), (-1, -1), 0.5, C_BORDER),
        ]))

        # ---- Tableau totaux (à droite) ----
        totals_rows: list[list[Any]] = []

        def _row(lbl: str, val: str, bold: bool = False, color: Any = None) -> list[Any]:
            l_style = st["total_label_bold"] if bold else st["total_label"]
            v_style = st["total_value_bold"] if bold else st["total_value"]
            if color:
                l_style = ParagraphStyle(f"tl_{lbl}", parent=l_style, textColor=color)
                v_style = ParagraphStyle(f"tv_{lbl}", parent=v_style, textColor=color)
            return [Paragraph(lbl, l_style), Paragraph(val, v_style)]

        totals_rows.append(_row("Total HT brut", _fmt_euro(total_ht_raw)))
        if discount_amount:
            totals_rows.append(_row(f"Remise ({_fmt_pct(self.data.global_discount_percent)})", f"- {_fmt_euro(discount_amount)}", color=self._c_accent))
            totals_rows.append(_row("Total HT net", _fmt_euro(total_ht_net), bold=True))

        for rate in sorted(tva_recap.keys()):
            totals_rows.append(_row(f"TVA {_fmt_pct(rate)}", _fmt_euro(tva_recap[rate])))

        if waste:
            totals_rows.append(_row("Frais de déchetterie", _fmt_euro(waste)))

        # Ligne TTC principale
        ttc_row = [
            Paragraph("TOTAL TTC", ParagraphStyle("ttcl", parent=st["total_ttc_label"])),
            Paragraph(_fmt_euro(total_ttc + waste), ParagraphStyle("ttcv", parent=st["total_ttc_value"])),
        ]

        if cee or mpr:
            if cee:
                totals_rows.append(_row("Prime CEE", f"- {_fmt_euro(cee)}", color=C_GREEN))
            if mpr:
                totals_rows.append(_row("Aide MaPrimeRénov'", f"- {_fmt_euro(mpr)}", color=C_GREEN))
            totals_rows.append(_row("Net à payer", _fmt_euro(net_a_payer), bold=True))

        if self.data.deposit_percent:
            totals_rows.append(_row(
                f"Acompte à la commande ({_fmt_pct(self.data.deposit_percent)})",
                _fmt_euro(deposit_amount),
                color=self._c_accent,
            ))

        totals_table = Table(totals_rows, colWidths=[60 * mm, 35 * mm])
        ttc_main = Table([ttc_row], colWidths=[60 * mm, 35 * mm])

        row_style_base: list[Any] = [
            ("LINEBELOW", (0, 0), (-1, -1), 0.3, C_BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 2 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm),
            ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
            ("BOX", (0, 0), (-1, -1), 0.5, C_BORDER),
        ]
        totals_table.setStyle(TableStyle(row_style_base))
        ttc_main.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), self._c_primary),
            ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
            ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
        ]))

        # Assemblage gauche/droite
        gap = USABLE_W - 88 * mm - 95 * mm
        outer = Table(
            [[tva_table, Spacer(gap, 1), Table([totals_rows], colWidths=[60 * mm, 35 * mm])]],
            colWidths=[88 * mm, gap, 95 * mm],
        )

        # Reconstruction correcte : empiler tva + totaux + ttc sur la droite
        right_col_tables: list[Any] = [totals_table, ttc_main]
        right_stack = Table([[t] for t in right_col_tables], colWidths=[95 * mm])
        right_stack.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))

        gap2 = USABLE_W - 88 * mm - 95 * mm
        final_row = Table(
            [[tva_table, Spacer(gap2, 1), right_stack]],
            colWidths=[88 * mm, max(gap2, 3 * mm), 95 * mm],
        )
        final_row.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))

        return [KeepTogether([final_row]), Spacer(1, 8 * mm)]

    # ------------------------------------------------------------------
    # Bloc signature "Bon pour accord"
    # ------------------------------------------------------------------

    def _build_signature_block(self) -> list[Any]:
        st = self.styles
        box_h = 35 * mm

        sign_content: list[Any] = [
            Paragraph("BON POUR ACCORD", st["sign_title"]),
            Spacer(1, 2 * mm),
            Paragraph("Lu et approuvé", st["sign_label"]),
            Spacer(1, 15 * mm),
            Paragraph("Signature et cachet", ParagraphStyle("sign_sub", parent=st["sign_label"], fontSize=7)),
            Paragraph("_" * 30, ParagraphStyle("sign_line", parent=st["sign_label"])),
            Spacer(1, 2 * mm),
            Paragraph("Le _____ / _____ / _________", st["sign_label"]),
        ]

        info_content: list[Any] = [
            Paragraph("CONDITIONS DE RÈGLEMENT", st["sign_title"]),
            Spacer(1, 2 * mm),
        ]
        if self.data.payment_terms:
            info_content.append(Paragraph(self.data.payment_terms, ParagraphStyle("pt", parent=st["sign_label"], alignment=TA_LEFT)))

        bank_text = self.data.bank_details if self.data.bank_details else (
            f"IBAN : {self.data.company.iban}" if self.data.company.iban else ""
        )
        if bank_text:
            info_content.append(Spacer(1, 2 * mm))
            info_content.append(Paragraph(bank_text, ParagraphStyle("bt", parent=st["sign_label"], alignment=TA_LEFT, fontSize=7.5)))
        if self.data.company.bic:
            info_content.append(Paragraph(f"BIC : {self.data.company.bic}", ParagraphStyle("bic", parent=st["sign_label"], alignment=TA_LEFT, fontSize=7.5)))

        col_w = USABLE_W / 2 - 6 * mm

        def _frame(content: list[Any], width: float) -> Table:
            rows = [[p] for p in content]
            t = Table(rows, colWidths=[width])
            t.setStyle(TableStyle([
                ("BOX", (0, 0), (-1, -1), 0.5, C_BORDER),
                ("BACKGROUND", (0, 0), (-1, -1), C_LIGHT),
                ("LEFTPADDING", (0, 0), (-1, -1), 5 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm),
            ]))
            return t

        sign_frame = _frame(sign_content, col_w)
        info_frame = _frame(info_content, col_w)

        row = Table(
            [[sign_frame, Spacer(12 * mm, 1), info_frame]],
            colWidths=[col_w, 12 * mm, col_w],
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
        parts: list[Any] = []

        if self.data.notes:
            parts.append(Paragraph("Notes", ParagraphStyle("notes_h", parent=st["block_title"], fontSize=8.5, textColor=C_TEXT)))
            parts.append(Paragraph(self.data.notes.replace("\n", "<br/>"), st["address_detail"]))
            parts.append(Spacer(1, 4 * mm))

        if self.data.conditions:
            parts.append(Paragraph("Conditions générales", ParagraphStyle("cg_h", parent=st["block_title"], fontSize=8.5, textColor=C_TEXT)))
            parts.append(Paragraph(self.data.conditions.replace("\n", "<br/>"), st["company_muted"]))
            parts.append(Spacer(1, 4 * mm))

        if self.data.legal_mentions:
            parts.append(Paragraph("Mentions légales", ParagraphStyle("ml_h", parent=st["block_title"], fontSize=8.5, textColor=C_TEXT)))
            parts.append(Paragraph(self.data.legal_mentions.replace("\n", "<br/>"), st["footer_note"]))

        return parts

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
            img._restrictSize(iw * ratio, ih * ratio)
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
