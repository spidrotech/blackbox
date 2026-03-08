"""
Service de facturation électronique conforme à la norme Factur-X (EN 16931).

Conformité avec la loi française sur la facturation électronique (article 26
de la loi de finances rectificative 2022, décrets 2024) :
  - Profil MINIMUM / BASIC WL pour les PME
  - Génération du XML CII (Cross Industry Invoice) embarqué dans le PDF/A-3
  - Mentions obligatoires : SIRET, TVA intracommunautaire, numéro de facture,
    date d'émission, date d'échéance, détail TVA par taux
  - Support des avoirs (credit notes) via TypeCode 381
"""

from __future__ import annotations

import io
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

try:
    from facturx import generate_from_binary
    HAS_FACTURX = True
except ImportError:
    HAS_FACTURX = False


# ---------------------------------------------------------------------------
# Data classes pour le mapping Factur-X
# ---------------------------------------------------------------------------

@dataclass
class FacturXSeller:
    """Vendeur / émetteur de la facture."""
    name: str = ""
    siret: str = ""
    siren: str = ""
    vat_number: str = ""          # FR12345678901
    street: str = ""
    city: str = ""
    postal_code: str = ""
    country_code: str = "FR"
    email: str = ""
    phone: str = ""


@dataclass
class FacturXBuyer:
    """Acheteur / destinataire de la facture."""
    name: str = ""
    siret: str = ""
    siren: str = ""
    vat_number: str = ""
    street: str = ""
    city: str = ""
    postal_code: str = ""
    country_code: str = "FR"
    email: str = ""


@dataclass
class FacturXLineItem:
    """Ligne de facturation."""
    description: str = ""
    quantity: float = 1.0
    unit_code: str = "C62"        # Unité UN/ECE Rec 20 (C62 = unité)
    unit_price: float = 0.0
    vat_rate: float = 20.0
    discount_percent: float = 0.0

    @property
    def net_amount(self) -> Decimal:
        sub = Decimal(str(self.quantity)) * Decimal(str(self.unit_price))
        if self.discount_percent:
            sub *= (Decimal("1") - Decimal(str(self.discount_percent)) / Decimal("100"))
        return sub.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @property
    def vat_amount(self) -> Decimal:
        return (self.net_amount * Decimal(str(self.vat_rate)) / Decimal("100")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )


@dataclass
class FacturXInvoice:
    """Données complètes pour la génération Factur-X."""
    invoice_number: str = ""
    invoice_date: date = field(default_factory=date.today)
    due_date: Optional[date] = None
    # 380 = Commercial invoice, 381 = Credit note
    type_code: str = "380"
    currency_code: str = "EUR"
    buyer_reference: str = ""     # N° commande / bon de commande
    payment_means_code: str = "30"  # 30 = virement, 48 = carte
    payment_terms: str = ""
    notes: str = ""

    seller: FacturXSeller = field(default_factory=FacturXSeller)
    buyer: FacturXBuyer = field(default_factory=FacturXBuyer)
    line_items: list[FacturXLineItem] = field(default_factory=list)

    # Coordonnées bancaires vendeur
    iban: str = ""
    bic: str = ""


# ---------------------------------------------------------------------------
# Mapping unité interne → UN/ECE Rec 20
# ---------------------------------------------------------------------------

UNIT_MAP: dict[str, str] = {
    "u": "C62",
    "unité": "C62",
    "h": "HUR",
    "heure": "HUR",
    "jour": "DAY",
    "j": "DAY",
    "m": "MTR",
    "m2": "MTK",
    "m²": "MTK",
    "m3": "MTQ",
    "m³": "MTQ",
    "kg": "KGM",
    "t": "TNE",
    "l": "LTR",
    "forfait": "C62",
    "lot": "C62",
    "ml": "LMT",
    "ens": "C62",
    "ensemble": "C62",
}


def map_unit(unit: str) -> str:
    """Convertit une unité interne vers le code UN/ECE Rec 20."""
    return UNIT_MAP.get(unit.lower().strip(), "C62")


# ---------------------------------------------------------------------------
# Génération XML CII (Cross Industry Invoice) — profil BASIC WL
# ---------------------------------------------------------------------------

RSM = "urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
RAM = "urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
QDT = "urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
UDT = "urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"


def _ns(prefix: str, tag: str) -> str:
    ns_map = {"rsm": RSM, "ram": RAM, "qdt": QDT, "udt": UDT}
    return f"{{{ns_map[prefix]}}}{tag}"


def _sub(parent: ET.Element, prefix: str, tag: str, text: Optional[str] = None, **attrs: str) -> ET.Element:
    attrib: dict[str, str] = dict(attrs) if attrs else {}
    elem = ET.SubElement(parent, _ns(prefix, tag), attrib)
    if text is not None:
        elem.text = text
    return elem


def _fmt_date(d: date) -> str:
    return d.strftime("%Y%m%d")


def _fmt_amount(val: Decimal) -> str:
    return str(val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def generate_facturx_xml(invoice: FacturXInvoice) -> bytes:
    """
    Génère le XML Factur-X (CII) conforme EN 16931 — profil BASIC WL.

    Mentions obligatoires incluses :
      - Numéro de facture, date, type (facture/avoir)
      - Identification du vendeur (SIRET, TVA)
      - Identification de l'acheteur (SIRET si connu, TVA si connu)
      - Détail des montants par taux TVA
      - Conditions de paiement, date d'échéance
      - Coordonnées bancaires (IBAN/BIC)
    """
    ET.register_namespace("rsm", RSM)
    ET.register_namespace("ram", RAM)
    ET.register_namespace("qdt", QDT)
    ET.register_namespace("udt", UDT)

    root = ET.Element(_ns("rsm", "CrossIndustryInvoice"))

    # ── Exchanged Document Context ──
    ctx = _sub(root, "rsm", "ExchangedDocumentContext")
    guide = _sub(ctx, "ram", "GuidelineSpecifiedDocumentContextParameter")
    _sub(guide, "ram", "ID", "urn:factur-x.eu:1p0:basicwl")

    # ── Exchanged Document ──
    doc = _sub(root, "rsm", "ExchangedDocument")
    _sub(doc, "ram", "ID", invoice.invoice_number)
    _sub(doc, "ram", "TypeCode", invoice.type_code)
    issue_dt = _sub(doc, "ram", "IssueDateTime")
    _sub(issue_dt, "udt", "DateTimeString", _fmt_date(invoice.invoice_date), format="102")
    if invoice.notes:
        note = _sub(doc, "ram", "IncludedNote")
        _sub(note, "ram", "Content", invoice.notes)

    # ── Supply Chain Trade Transaction ──
    txn = _sub(root, "rsm", "SupplyChainTradeTransaction")

    # --- Header Trade Agreement ---
    agreement = _sub(txn, "ram", "ApplicableHeaderTradeAgreement")

    if invoice.buyer_reference:
        _sub(agreement, "ram", "BuyerReference", invoice.buyer_reference)

    # Seller
    seller_party = _sub(agreement, "ram", "SellerTradeParty")
    _sub(seller_party, "ram", "Name", invoice.seller.name)

    if invoice.seller.siret:
        seller_id = _sub(seller_party, "ram", "ID", invoice.seller.siret)

    if invoice.seller.vat_number:
        seller_tax = _sub(seller_party, "ram", "SpecifiedTaxRegistration")
        _sub(seller_tax, "ram", "ID", invoice.seller.vat_number, schemeID="VA")

    seller_addr = _sub(seller_party, "ram", "PostalTradeAddress")
    _sub(seller_addr, "ram", "PostcodeCode", invoice.seller.postal_code)
    _sub(seller_addr, "ram", "LineOne", invoice.seller.street)
    _sub(seller_addr, "ram", "CityName", invoice.seller.city)
    _sub(seller_addr, "ram", "CountryID", invoice.seller.country_code)

    if invoice.seller.email:
        seller_uric = _sub(seller_party, "ram", "URIUniversalCommunication")
        _sub(seller_uric, "ram", "URIID", invoice.seller.email, schemeID="EM")

    # Buyer
    buyer_party = _sub(agreement, "ram", "BuyerTradeParty")
    _sub(buyer_party, "ram", "Name", invoice.buyer.name)

    if invoice.buyer.siret:
        _sub(buyer_party, "ram", "ID", invoice.buyer.siret)

    if invoice.buyer.vat_number:
        buyer_tax = _sub(buyer_party, "ram", "SpecifiedTaxRegistration")
        _sub(buyer_tax, "ram", "ID", invoice.buyer.vat_number, schemeID="VA")

    buyer_addr = _sub(buyer_party, "ram", "PostalTradeAddress")
    _sub(buyer_addr, "ram", "PostcodeCode", invoice.buyer.postal_code)
    _sub(buyer_addr, "ram", "LineOne", invoice.buyer.street)
    _sub(buyer_addr, "ram", "CityName", invoice.buyer.city)
    _sub(buyer_addr, "ram", "CountryID", invoice.buyer.country_code)

    # --- Header Trade Delivery ---
    _sub(txn, "ram", "ApplicableHeaderTradeDelivery")

    # --- Header Trade Settlement ---
    settle = _sub(txn, "ram", "ApplicableHeaderTradeSettlement")
    _sub(settle, "ram", "InvoiceCurrencyCode", invoice.currency_code)

    # Payment means
    pm = _sub(settle, "ram", "SpecifiedTradeSettlementPaymentMeans")
    _sub(pm, "ram", "TypeCode", invoice.payment_means_code)
    if invoice.iban:
        payee_account = _sub(pm, "ram", "PayeePartyCreditorFinancialAccount")
        _sub(payee_account, "ram", "IBANID", invoice.iban)
        if invoice.bic:
            payee_inst = _sub(pm, "ram", "PayeeSpecifiedCreditorFinancialInstitution")
            _sub(payee_inst, "ram", "BICID", invoice.bic)

    # Tax breakdown by rate
    vat_groups: dict[float, dict[str, Decimal]] = {}
    for item in invoice.line_items:
        rate = item.vat_rate
        if rate not in vat_groups:
            vat_groups[rate] = {"base": Decimal("0"), "tax": Decimal("0")}
        vat_groups[rate]["base"] += item.net_amount
        vat_groups[rate]["tax"] += item.vat_amount

    total_tax = Decimal("0")
    total_net = Decimal("0")
    for rate, amounts in sorted(vat_groups.items()):
        trade_tax = _sub(settle, "ram", "ApplicableTradeTax")
        _sub(trade_tax, "ram", "CalculatedAmount", _fmt_amount(amounts["tax"]))
        _sub(trade_tax, "ram", "TypeCode", "VAT")
        _sub(trade_tax, "ram", "BasisAmount", _fmt_amount(amounts["base"]))
        _sub(trade_tax, "ram", "CategoryCode", "S")
        _sub(trade_tax, "ram", "RateApplicablePercent", str(rate))
        total_tax += amounts["tax"]
        total_net += amounts["base"]

    total_gross = total_net + total_tax

    # Payment terms
    if invoice.payment_terms or invoice.due_date:
        pt = _sub(settle, "ram", "SpecifiedTradePaymentTerms")
        if invoice.payment_terms:
            _sub(pt, "ram", "Description", invoice.payment_terms)
        if invoice.due_date:
            due_dt = _sub(pt, "ram", "DueDateDateTime")
            _sub(due_dt, "udt", "DateTimeString", _fmt_date(invoice.due_date), format="102")

    # Monetary summation
    ms = _sub(settle, "ram", "SpecifiedTradeSettlementHeaderMonetarySummation")
    _sub(ms, "ram", "LineTotalAmount", _fmt_amount(total_net))
    _sub(ms, "ram", "TaxBasisTotalAmount", _fmt_amount(total_net))
    tax_total = _sub(ms, "ram", "TaxTotalAmount", _fmt_amount(total_tax))
    tax_total.set("currencyID", invoice.currency_code)
    _sub(ms, "ram", "GrandTotalAmount", _fmt_amount(total_gross))
    _sub(ms, "ram", "DuePayableAmount", _fmt_amount(total_gross))

    # --- Line items (doivent venir après les blocs header selon le schéma CII) ---
    for idx, item in enumerate(invoice.line_items, start=1):
        li = _sub(txn, "ram", "IncludedSupplyChainTradeLineItem")

        li_doc = _sub(li, "ram", "AssociatedDocumentLineDocument")
        _sub(li_doc, "ram", "LineID", str(idx))

        product = _sub(li, "ram", "SpecifiedTradeProduct")
        _sub(product, "ram", "Name", item.description or f"Article {idx}")

        line_agreement = _sub(li, "ram", "SpecifiedLineTradeAgreement")
        net_price = _sub(line_agreement, "ram", "NetPriceProductTradePrice")
        _sub(net_price, "ram", "ChargeAmount", _fmt_amount(Decimal(str(item.unit_price))))

        line_delivery = _sub(li, "ram", "SpecifiedLineTradeDelivery")
        _sub(line_delivery, "ram", "BilledQuantity", str(item.quantity), unitCode=item.unit_code)

        line_settlement = _sub(li, "ram", "SpecifiedLineTradeSettlement")
        tax = _sub(line_settlement, "ram", "ApplicableTradeTax")
        _sub(tax, "ram", "TypeCode", "VAT")
        _sub(tax, "ram", "CategoryCode", "S")
        _sub(tax, "ram", "RateApplicablePercent", str(item.vat_rate))

        monetary = _sub(line_settlement, "ram", "SpecifiedTradeSettlementLineMonetarySummation")
        _sub(monetary, "ram", "LineTotalAmount", _fmt_amount(item.net_amount))

    # Serialize
    tree = ET.ElementTree(root)
    buf = io.BytesIO()
    tree.write(buf, xml_declaration=True, encoding="UTF-8")
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Embarquement du XML dans le PDF → PDF/A-3 Factur-X
# ---------------------------------------------------------------------------

def generate_facturx_pdf(pdf_bytes: bytes, invoice: FacturXInvoice) -> bytes:
    """
    Prend un PDF existant (généré par pdf_service) et embarque le XML Factur-X
    pour produire un PDF/A-3 conforme.

    Nécessite la librairie ``factur-x`` (pip install factur-x).
    """
    if not HAS_FACTURX:
        raise ImportError(
            "La librairie factur-x est requise pour la facturation électronique. "
            "Installez-la : pip install factur-x"
        )

    xml_bytes = generate_facturx_xml(invoice)

    facturx_pdf = generate_from_binary(
        pdf_bytes,
        xml_bytes,
        flavor="factur-x",
        level="basicwl",
    )

    return facturx_pdf


# ---------------------------------------------------------------------------
# Helper : convertir les données internes vers FacturXInvoice
# ---------------------------------------------------------------------------

def build_facturx_invoice_from_db(
    invoice_obj: object,
    company_obj: object,
    customer_obj: object,
    line_items: list[object],
) -> FacturXInvoice:
    """
    Construit un FacturXInvoice à partir des objets DB (Invoice, Company, Customer, LineItem).
    Utilise getattr pour être agnostique du type exact.
    """
    seller = FacturXSeller(
        name=getattr(company_obj, "name", "") or "",
        siret=getattr(company_obj, "siret", "") or "",
        siren=(getattr(company_obj, "siret", "") or "")[:9],
        vat_number=getattr(company_obj, "vat_number", "") or "",
        street=getattr(company_obj, "address", "") or "",
        city=getattr(company_obj, "city", "") or "",
        postal_code=getattr(company_obj, "postal_code", "") or "",
        country_code="FR",
        email=getattr(company_obj, "email", "") or "",
        phone=getattr(company_obj, "phone", "") or "",
    )

    buyer = FacturXBuyer(
        name=getattr(customer_obj, "name", "") or "",
        siret=getattr(customer_obj, "siret", "") or "",
        siren=(getattr(customer_obj, "siret", "") or "")[:9],
        vat_number=getattr(customer_obj, "vat", "") or "",
        street=getattr(customer_obj, "address", "") or "",
        city=getattr(customer_obj, "city", "") or "",
        postal_code=getattr(customer_obj, "postal_code", "") or "",
        country_code="FR",
        email=getattr(customer_obj, "email", "") or "",
    )

    items: list[FacturXLineItem] = []
    for li in line_items:
        raw_unit = getattr(li, "unit", "u") or "u"
        items.append(FacturXLineItem(
            description=getattr(li, "description", "") or "",
            quantity=float(getattr(li, "quantity", 1)),
            unit_code=map_unit(raw_unit),
            unit_price=float(getattr(li, "unit_price", 0)),
            vat_rate=float(getattr(li, "tax_rate", 20)),
            discount_percent=float(getattr(li, "discount_percent", 0) or 0),
        ))

    inv_type = getattr(invoice_obj, "invoice_type", "invoice") or "invoice"
    type_code = "381" if inv_type == "credit_note" else "380"

    inv_date = getattr(invoice_obj, "invoice_date", None) or date.today()
    due = getattr(invoice_obj, "due_date", None)

    return FacturXInvoice(
        invoice_number=getattr(invoice_obj, "reference", "") or "",
        invoice_date=inv_date,
        due_date=due,
        type_code=type_code,
        currency_code="EUR",
        buyer_reference=getattr(invoice_obj, "purchase_order", "") or "",
        payment_means_code="30",  # Virement bancaire par défaut
        payment_terms=getattr(invoice_obj, "payment_terms", "") or "",
        notes=getattr(invoice_obj, "notes", "") or "",
        seller=seller,
        buyer=buyer,
        line_items=items,
        iban=getattr(company_obj, "iban", "") or "",
        bic=getattr(company_obj, "bic", "") or "",
    )
