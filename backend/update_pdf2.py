import re

path = 'C:/workspace/blackbox/backend/app/services/pdf_service.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Header
header_old = """        left_parts.append(Paragraph(company.name or "Votre entreprise", st["company_name"]))

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
            left_parts.append(Paragraph("  ─  ".join(legal_parts), st["company_muted"]))"""

header_new = """        if company.header_text:
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
                left_parts.append(Paragraph("  ─  ".join(legal_parts), st["company_muted"]))"""

if header_old in content:
    content = content.replace(header_old, header_new)
    print("Header replaced successfully.")
else:
    print("Header strictly not found.")

footer_old = """        # Footer gauche : mentions légales complètes (style Obat)
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
            legal_parts.append(f"Capital {int(co.capital):,} €".replace(",", " "))
        if co.ape_code:
            legal_parts.append(f"APE {co.ape_code}")
        # Custom footer text overrides or appends
        if self.footer_text and self.footer_text != co.name:
            legal_parts.append(self.footer_text)
        footer_line = "  ·  ".join(legal_parts)
        canvas.drawString(MARGIN_L, MARGIN_B - 6 * mm, footer_line)"""

footer_new = """        # Footer gauche : mentions légales complètes (style Obat) ou personnalisé
        canvas.setFont("Helvetica", 6.5)
        canvas.setFillColor(C_MUTED)
        
        if self.footer_text:
            lines = [l.strip() for l in self.footer_text.split('\\n') if l.strip()]
            y_pos = MARGIN_B - 6 * mm
            for line in reversed(lines):
                # multi line custom
                canvas.drawString(MARGIN_L, y_pos, line)
                y_pos += 8 # 8 points is a bit more than 6.5 font size
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
            canvas.drawString(MARGIN_L, MARGIN_B - 6 * mm, footer_line)"""

if footer_old in content:
    content = content.replace(footer_old, footer_new)
    print("Footer replaced successfully.")
else:
    print("Footer strictly not found.")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
