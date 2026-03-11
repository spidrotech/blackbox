import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def build_password_reset_link(token: str) -> str:
    return f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token}"


def send_password_reset_email(recipient: str, reset_link: str) -> bool:
    if not settings.SMTP_HOST:
        return False

    message = EmailMessage()
    message["Subject"] = "Réinitialisation de votre mot de passe Gestar"
    message["From"] = settings.SMTP_FROM_EMAIL
    message["To"] = recipient
    message.set_content(
        "Bonjour,\n\n"
        "Une demande de réinitialisation de mot de passe a été effectuée pour votre compte Gestar.\n"
        f"Utilisez ce lien pour définir un nouveau mot de passe : {reset_link}\n\n"
        f"Ce lien expire dans {settings.RESET_TOKEN_EXPIRE_MINUTES} minutes.\n"
        "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.\n\n"
        "L'équipe Gestar"
    )

    try:
        if settings.SMTP_USE_SSL:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(message)
            return True

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(message)
        return True
    except Exception:
        logger.exception("Failed to send password reset email to %s", recipient)
        return False