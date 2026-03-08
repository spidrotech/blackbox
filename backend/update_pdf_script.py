import re

path = 'C:/workspace/blackbox/backend/app/services/pdf_service.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update _PageTemplate class
page_template_old = """class _PageTemplate:
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

# We'll use regex to grab the whole class if an exact string doesn't match
