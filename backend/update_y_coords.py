import re

path = 'C:/workspace/blackbox/backend/app/services/pdf_service.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# I will replace the inside of `__call__` completely to be safe.
# Actually I'll replace the whole class again.

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

        # Ligne séparatrice footer (at 18mm from bottom)
        canvas.setStrokeColor(C_BORDER)
        canvas.setLineWidth(0.5)
        canvas.line(MARGIN_L, 18 * mm, PAGE_W - MARGIN_R, 18 * mm)

        # Draw RGE QualiPAC pseudo-logo
        logo_x = MARGIN_L
        logo_y = 6 * mm
        canvas.setFillColor(colors.HexColor("#7E22CE")) # Purple
        canvas.rect(logo_x, logo_y, 22 * mm, 10 * mm, fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor("#FFFFFF"))
        
        # Red little square for RGE style
        canvas.setFillColor(colors.HexColor("#EF4444"))
        canvas.rect(logo_x + 16 * mm, logo_y + 5 * mm, 4 * mm, 4 * mm, fill=1, stroke=0)
        
        canvas.setFillColor(colors.HexColor("#FFFFFF"))
        canvas.setFont("Helvetica-Bold", 8)
        canvas.drawString(logo_x + 2 * mm, logo_y + 5.5 * mm, "RGE")
        canvas.setFont("Helvetica", 7)
        canvas.drawString(logo_x + 2 * mm, logo_y + 2 * mm, "QualiPAC")

        # Footer central
        canvas.setFont("Helvetica", 6.5)
        canvas.setFillColor(C_MUTED)
        
        if self.footer_text:
            lines = [l.strip() for l in self.footer_text.split('\\n') if l.strip()]
            y_pos = 14 * mm
            for line in lines:
                canvas.drawCentredString(PAGE_W / 2.0, y_pos, line)
                y_pos -= 8
        else:
            co = self.company
            addr_line = f"{co.name} - {co.address} {co.postal_code} {co.city}".strip(" -")
            
            legal_parts = []
            if co.siret: legal_parts.append(f"SIRET : {co.siret}")
            if co.vat_number and co.vat_subject: legal_parts.append(f"TVA inter : {co.vat_number}")
            if co.rcs_city: legal_parts.append(f"RCS {co.rcs_city}")
            if co.rm_number: legal_parts.append(f"RM {co.rm_number}")
            if co.capital: legal_parts.append(f"Capital {int(co.capital):,} €".replace(",", " "))
            if co.ape_code: legal_parts.append(f"APE {co.ape_code}")
            
            legal_line = " - ".join(legal_parts)
            contact_line = f"Tél : {co.phone} - {co.website} - {co.email}".strip(" -")
            
            y_pos = 14 * mm
            canvas.drawCentredString(PAGE_W / 2.0, y_pos, addr_line)
            y_pos -= 8
            canvas.drawCentredString(PAGE_W / 2.0, y_pos, legal_line)
            y_pos -= 8
            canvas.drawCentredString(PAGE_W / 2.0, y_pos, contact_line)
            
        # Footer droite
        canvas.setFillColor(C_TEXT)
        canvas.setFont("Helvetica", 7)
        right_y = 10 * mm
        if self.reference:
            canvas.drawRightString(PAGE_W - MARGIN_R, right_y + 4 * mm, self.reference)
        page_str = f"Page {doc.page}"
        canvas.drawRightString(PAGE_W - MARGIN_R, right_y, page_str)

        canvas.restoreState()"""

class_regex = re.compile(r'class _PageTemplate:.*?canvas\.restoreState\(\)"""?', re.DOTALL)
if class_regex.search(content):
    content = class_regex.sub(new_template, content)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed coordinates and layout of footer!")
else:
    print("Class regex failed to match. Using direct replace.")
    # fallback
    start_str = "class _PageTemplate:"
    end_str = "canvas.restoreState()"
    s_idx = content.find(start_str)
    e_idx = content.find(end_str)
    if s_idx != -1 and e_idx != -1:
        content = content[:s_idx] + new_template + content[e_idx + len(end_str):]
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Fixed coordinates through fallback mode!")
    else:
        print("CRITICAL extraction failure")
