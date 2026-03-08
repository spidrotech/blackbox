import re

with open('C:/workspace/blackbox/backend/app/services/pdf_service.py', 'r', encoding='utf-8') as f:
    content = f.read()

header_replacement = """        if company.header_text:
            lines = [l.strip() for l in company.header_text.split('\\n') if l.strip()]
            if lines:
                left_parts.append(Paragraph(lines[0], st["company_name"]))
                if len(lines) > 1:
                    rest = "<br/>".join(lines[1:])
                    left_parts.append(Paragraph(rest, st["company_detail"]))
        else:
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
                left_parts.append(Paragraph("  ·  ".join(legal_parts), st["company_muted"]))"""

header_rgx = re.compile(
    r'left_parts\.append\(Paragraph\(company\.name or "Votre entreprise",\s*st\["company_name"\]\)\).*?(?=right_parts: list\[Any\] = \[\])', 
    re.DOTALL
)

if header_rgx.search(content):
    content = header_rgx.sub(header_replacement + '\n\n        ', content)
else:
    print("Header regex not found")

footer_replacement = """        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(HexColor("#94a3b8"))

        if self.footer_text:
            lines = [l.strip() for l in self.footer_text.split('\\n') if l.strip()]
            y_pos = MARGIN_B - 6 * mm
            for line in reversed(lines):
                canvas.drawCentredString(PAGE_W / 2.0, y_pos, line)
                y_pos += 10
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
            y_pos = MARGIN_B - 6 * mm
            canvas.drawCentredString(PAGE_W / 2.0, y_pos, footer_line)

        # Footer droite : numéro de page
        page_str = f"Page {doc.page}"
        canvas.drawRightString(PAGE_W - MARGIN_R, MARGIN_B - 6 * mm, page_str)"""

footer_rgx = re.compile(
    r'canvas\.setFont\("Helvetica", 8\)\s*canvas\.setFillColor\(HexColor\("#94a3b8"\)\)\s*co = self\.company\s*legal_parts = \[co\.name\].*?canvas\.drawRightString\(PAGE_W - MARGIN_R, MARGIN_B - 6 \* mm, page_str\)',
    re.DOTALL
)

if footer_rgx.search(content):
    content = footer_rgx.sub(footer_replacement, content)
else:
    print("Footer regex not found")

with open('C:/workspace/blackbox/backend/app/services/pdf_service.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("PDF service updated")
