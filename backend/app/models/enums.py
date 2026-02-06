from enum import Enum

class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    PARTIAL = "partial"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

    @property
    def label(self) -> str:
        labels = {
            "draft": "Brouillon",
            "sent": "Envoyée",
            "paid": "Payée",
            "partial": "Paiement partiel",
            "overdue": "En retard",
            "cancelled": "Annulée",
        }
        return labels.get(self.value, self.value)

    @property
    def color(self) -> str:
        colors = {
            "draft": "gray",
            "sent": "blue",
            "paid": "green",
            "partial": "info",
            "overdue": "red",
            "cancelled": "red",
        }
        return colors.get(self.value, "gray")


class QuoteStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    VIEWED = "viewed"
    SIGNED = "signed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    FINALIZED = "finalized"

    @property
    def label(self) -> str:
        labels = {
            "draft": "Brouillon",
            "sent": "Envoyé",
            "viewed": "Consulté",
            "signed": "Signé",
            "accepted": "Accepté",
            "rejected": "Refusé",
            "expired": "Expiré",
            "cancelled": "Annulé",
            "finalized": "Finalisé",
        }
        return labels.get(self.value, self.value)

    @property
    def color(self) -> str:
        colors = {
            "draft": "gray",
            "sent": "blue",
            "viewed": "info",
            "signed": "green",
            "accepted": "green",
            "finalized": "green",
            "rejected": "red",
            "cancelled": "red",
            "expired": "orange",
        }
        return colors.get(self.value, "gray")


class ProjectStatus(str, Enum):
    DRAFT = "draft"
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ON_HOLD = "on_hold"
    CANCELLED = "cancelled"


class ProjectPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class CustomerType(str, Enum):
    INDIVIDUAL = "individual"
    COMPANY = "company"


class UserRole(str, Enum):
    USER = "ROLE_USER"
    OWNER = "ROLE_OWNER"
    MANAGER = "ROLE_MANAGER"
    COMMERCIAL = "ROLE_COMMERCIAL"
    CHEF_CHANTIER = "ROLE_CHEF_CHANTIER"
    OUVRIER = "ROLE_OUVRIER"


class EquipmentStatus(str, Enum):
    AVAILABLE = "available"
    IN_USE = "in_use"
    MAINTENANCE = "maintenance"
    BROKEN = "broken"
    RETIRED = "retired"


class EquipmentOwnership(str, Enum):
    OWNED = "owned"
    RENTED = "rented"
    LEASED = "leased"


class TimeEntryType(str, Enum):
    WORK = "work"
    TRAVEL = "travel"
    BREAK = "break"
    OVERTIME = "overtime"


class TimeEntryStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class PurchaseStatus(str, Enum):
    PENDING = "pending"
    PARTIAL = "partial"
    PAID = "paid"
    CANCELLED = "cancelled"


class PurchaseCategory(str, Enum):
    MATERIALS = "materials"
    EQUIPMENT = "equipment"
    SUBCONTRACT = "subcontract"
    TRANSPORT = "transport"
    TOOLS = "tools"
    CONSUMABLES = "consumables"
    OTHER = "other"


class SupplierType(str, Enum):
    MATERIALS = "materials"
    EQUIPMENT = "equipment"
    SUBCONTRACTOR = "subcontractor"
    SERVICES = "services"
    OTHER = "other"


class LineItemType(str, Enum):
    SUPPLY = "supply"
    LABOR = "labor"
    OTHER = "other"
