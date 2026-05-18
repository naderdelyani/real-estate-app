"""
Email worker — subscribes to the 'notifications.email' RabbitMQ queue
and dispatches transactional emails via SMTP using aiosmtplib.
"""

import json
import logging
import os

import aio_pika
import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text      import MIMEText

logger = logging.getLogger(__name__)

QUEUE_NAME = "notifications.email"

SMTP_HOST   = os.getenv("SMTP_HOST",     "smtp.gmail.com")
SMTP_PORT   = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER   = os.getenv("SMTP_USER",     "")
SMTP_PASS   = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM   = os.getenv("SMTP_FROM",     "noreply@realestate.app")


async def send_email(to: str, subject: str, html_body: str) -> None:
    """
    Sends a single HTML email via STARTTLS.

    Args:
        to:        Recipient email address.
        subject:   Email subject line.
        html_body: HTML content of the email.
    """
    message = MIMEMultipart("alternative")
    message["From"]    = SMTP_FROM
    message["To"]      = to
    message["Subject"] = subject
    message.attach(MIMEText(html_body, "html"))

    await aiosmtplib.send(
        message,
        hostname=SMTP_HOST,
        port=SMTP_PORT,
        username=SMTP_USER,
        password=SMTP_PASS,
        start_tls=True,
    )
    logger.info("Email sent to %s | subject: %s", to, subject)


def _render_appointment_email(payload: dict) -> tuple[str, str]:
    """Builds the subject and HTML body for an appointment confirmation email."""
    subject = "Your viewing appointment is confirmed"
    html = f"""
    <html><body style="font-family:Arial,sans-serif;color:#333">
      <h2>Appointment Confirmed</h2>
      <p>Your viewing for property <strong>{payload.get('propertyTitle','')}</strong>
         has been scheduled for <strong>{payload.get('scheduledAt','')}</strong>.</p>
      <p>If you need to reschedule, please contact us.</p>
      <br/><p>— The Real Estate Team</p>
    </body></html>
    """
    return subject, html


def _render_welcome_email(payload: dict) -> tuple[str, str]:
    """Builds the subject and HTML body for a welcome email after registration."""
    subject = f"Welcome to Real Estate App, {payload.get('name', '')}!"
    html = f"""
    <html><body style="font-family:Arial,sans-serif;color:#333">
      <h2>Welcome, {payload.get('name', '')}!</h2>
      <p>Your account has been created. Start browsing thousands of verified listings today.</p>
      <a href="{os.getenv('NEXT_PUBLIC_APP_URL','http://localhost:3000')}/properties"
         style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">
        Browse Properties
      </a>
      <br/><br/><p>— The Real Estate Team</p>
    </body></html>
    """
    return subject, html


async def process_email_message(message: aio_pika.IncomingMessage) -> None:
    """Deserializes a RabbitMQ message and dispatches the appropriate email."""
    async with message.process():
        try:
            payload  = json.loads(message.body.decode())
            event    = payload.get("event")
            to_email = payload.get("email")

            if not to_email:
                logger.warning("Email message missing 'email' field, skipping")
                return

            if event == "appointment.created":
                subject, html = _render_appointment_email(payload)
            elif event == "user.registered":
                subject, html = _render_welcome_email(payload)
            else:
                logger.debug("Unhandled email event: %s", event)
                return

            await send_email(to_email, subject, html)

        except Exception as exc:
            logger.error("Failed to process email message: %s", exc, exc_info=True)


async def start_email_consumer(connection: aio_pika.RobustConnection) -> None:
    """Declares the email queue and begins consuming messages."""
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=5)

    queue = await channel.declare_queue(QUEUE_NAME, durable=True)
    logger.info("Email consumer listening on queue: %s", QUEUE_NAME)

    await queue.consume(process_email_message)
