import re

path = 'C:/workspace/blackbox/backend/app/services/pdf_service.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update 1: PageTemplate __init__ and __call__ 
old_template = """class _PageTemplate:
    \"\"\"Canvas callback : numérotation + footer + filigrane BROUILLON.\"\"\"

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

        # Footer gauche : mentions légales ou personnalisées
        canvas.setFont("Helvetica", 6.5)
        canvas.setFillColor(C_MUTED)
        
        if self.footer_text:
            lines = [l.strip() for l in self.footer_text.split('\\n') if l.strip()]
            y_pos = MARGIN_B - 6 * mm
            for line in reversed(lines):
                # On centre le texte multiligne
                canvas.drawCentredString(PAGE_W / 2.0, y_pos, line)
                y_pos += 8
        else:
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
                legal_parts.append(f"Capital {int(co.capital):,} €".replace(",", " "))
            if co.ape_code:
                legal_parts.append(f"APE {co.ape_code}")
            
            footer_line = "  ·  ".join(legal_parts)
            # Affichage sur une seule ligne centrée ou gauche
            canvas.drawString(MARGIN_L, MARGIN_B - 6 * mm, footer_line)

        # Footer droite : numéro de page
        page_str = f"Page {doc.page}"
        canvas.drawRightString(PAGE_W - MARGIN_R, MARGIN_B - 6 * mm, page_str)

        canvas.restoreState()"""

new_template = """class _PageTemplate:
    \"\"\"Canvas callback : numérotation + footer + filigrane BROUILLON.\"\"\"

    def __init__(self, company: CompanyData, is_draft: bool, footer_text: str, reference: str = "") -> None:
        self.company = company
        self.is_draft = is_draft
        self.footer_text = footer_text
        self.reference = reference

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

        # Dessin d'un faux logo QualiPAC (texte stylisé) à gauche
        # On le dessine manuellement pour qu'il soit là sans dépendance image externe
        logo_x = MARGIN_L
        logo_y = MARGIN_B - 14 * mm
        canvas.setFillColor(colors.HexColor("#7E22CE")) # Violet QualiPAC
        canvas.rect(logo_x, logo_y, 22 * mm, 10 * mm, fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor("#FFFFFF"))
        canvas.setFont("Helvetica-Bold", 8)
        canvas.drawString(logo_x + 2 * mm, logo_y + 6 * mm, "RGE")
        canvas.setFont("Helvetica", 7)
        canvas.drawString(logo_x + 2 * mm, logo_y + 2 * mm, "QualiPAC")

        # Footer central : mentions légales ou personnalisées
        canvas.setFont("Helvetica", 6.5)
        canvas.setFillColor(C_MUTED)
        
        if self.footer_text:
            lines = [l.strip() for l in self.footer_text.split('\\n') if l.strip()]
            y_pos = MARGIN_B - 6 * mm
            for line in reversed(lines):
                # On centre le texte multiligne
                canvas.drawCentredString(PAGE_W / 2.0, y_pos, line)
                y_pos += 8
        else:
            co = self.company
            addr_line = f"{co.name} - {co.address} {co.postal_code} {co.city}".strip()
            
            legal_parts = []
            if co.siret: legal_parts.append(f"SIRET : {co.siret}")
            if co.vat_number and co.vat_subject: legal_parts.append(f"TVA inter : {co.vat_number}")
            if co.rcs_city: legal_parts.append(f"RCS {co.rcs_city}")
            if co.rm_number: legal_parts.append(f"RM {co.rm_number}")
            if co.capital: legal_parts.append(f"Capital {int(co.capital):,} €".replace(",", " "))
            if co.ape_code: legal_parts.append(f"APE {co.ape_code}")
            
            legal_line = " - ".join(legal_parts)
            contact_line = f"Tél : {co.phone} - {co.website} - {co.email}".strip(" -")
            
            y_pos = MARGIN_B - 6 * mm
            canvas.drawCentredString(PAGE_W / 2.0, y_pos, contact_line)
            y_pos += 8
            canvas.drawCentredString(PAGE_W / 2.0, y_pos, legal_line)
            y_pos += 8
            canvas.drawCentredString(PAGE_W / 2.0, y_pos, addr_line)
            
        # Footer droite : numéro de page et devis
        canvas.setFillColor(C_TEXT)
        canvas.setFont("Helvetica", 7)
        right_y = MARGIN_B - 6 * mm
        if self.reference:
            canvas.drawRightString(PAGE_W - MARGIN_R, right_y + 8, self.reference)
        page_str = f"Page {doc.page}"
        canvas.drawRightString(PAGE_W - MARGIN_R, right_y, page_str)

        canvas.restoreState()"""

content = content.replace(old_template, new_template)

# Replace the instanciation
gen_old = """        template_cb = _PageTemplate(
            self.data.company,
            self._is_draft,
            self.data.company.footer_text,
        )"""

gen_new = """        template_cb = _PageTemplate(
            self.data.company,
            self._is_draft,
            self.data.company.footer_text,
            self.data.reference
        )"""

if gen_old in content:
    content = content.replace(gen_old, gen_new)
else:
    print("WARNING: gen_old not found!")


# Replace the Notes Block to include bank details
notes_old = """    def _build_notes_block(self) -> list[Any]:
        st = self.styles
        parts: list[Any] = []

        if self.data.notes:
            parts.append(Paragraph("Notes", ParagraphStyle("notes_h", parent=st["block_title"], fontSize=8.5, textColor=C_TEXT)))
            parts.append(Paragraph(self.data.notes.replace("\\n", "<br/>"), st["address_detail"]))
            parts.append(Spacer(1, 4 * mm))"""

notes_new = """    def _build_notes_block(self) -> list[Any]:
        st = self.styles
        parts: list[Any] = []

        # Add notes AND Bank info
        has_notes = bool(self.data.notes)
        has_bank = bool(self.data.company.iban)
        
        if has_notes or has_bank:
            parts.append(Paragraph("Notes", ParagraphStyle("notes_h", parent=st["block_title"], fontSize=8.5, textColor=C_TEXT)))
            if has_notes:
                parts.append(Paragraph(self.data.notes.replace("\\n", "<br/>"), st["address_detail"]))
            
            if has_bank:
                co = self.data.company
                bank_lines = []
                bank_lines.append(f"Titulaire du compte <b>{co.name}</b>")
                if co.iban: bank_lines.append(f"IBAN {co.iban}")
                if co.bic: bank_lines.append(f"BIC {co.bic}")
                bank_text = "<br/>".join(bank_lines)
                
                parts.append(Spacer(1, 2 * mm))
                parts.append(Paragraph(bank_text, st["address_detail"]))
                
            parts.append(Spacer(1, 4 * mm))"""

if notes_old in content:
    content = content.replace(notes_old, notes_new)
else:
    print("WARNING: notes_old not found!")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Bank & Footer PDF structure applied!")
