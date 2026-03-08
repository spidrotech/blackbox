import re
path = 'C:/workspace/blackbox/backend/app/services/pdf_service.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

footer_matcher = re.compile(
    r'# Footer gauche : mentions.*?(?=# Footer droite : num)',
    re.DOTALL
)

footer_new = """# Footer gauche : mentions légales ou personnalisées
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

        """

match = footer_matcher.search(content)
if match:
    content = content[:match.start()] + footer_new + content[match.end():]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Footer logic updated.")
else:
    print("Regex failed.")
