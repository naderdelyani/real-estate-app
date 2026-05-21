"""
Email worker — subscribes to the 'notifications.email' RabbitMQ queue
and dispatches transactional emails via SMTP using aiosmtplib.
Supports English and Farsi (Persian) email templates.
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

APP_URL = os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")


async def send_email(to: str, subject: str, html_body: str) -> None:
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


def _render_appointment_email(payload: dict, locale: str) -> tuple[str, str]:
    title       = payload.get("propertyTitle", "")
    scheduled   = payload.get("scheduledAt", "")

    if locale == "fa":
        subject = "قرار بازدید شما تایید شد"
        html = f"""
        <html dir="rtl">
        <body style="font-family:'Vazirmatn',Arial,sans-serif;color:#333;direction:rtl;text-align:right">
          <h2>قرار بازدید تایید شد</h2>
          <p>بازدید از ملک <strong>{title}</strong> برای <strong>{scheduled}</strong> زمان‌بندی شده است.</p>
          <p>در صورت نیاز به تغییر زمان، با ما تماس بگیرید.</p>
          <br/><p>— تیم اپلیکیشن املاک</p>
        </body></html>
        """
    else:
        subject = "Your viewing appointment is confirmed"
        html = f"""
        <html><body style="font-family:Arial,sans-serif;color:#333">
          <h2>Appointment Confirmed</h2>
          <p>Your viewing for property <strong>{title}</strong>
             has been scheduled for <strong>{scheduled}</strong>.</p>
          <p>If you need to reschedule, please contact us.</p>
          <br/><p>— The Real Estate Team</p>
        </body></html>
        """
    return subject, html


def _render_welcome_email(payload: dict, locale: str) -> tuple[str, str]:
    name = payload.get("name", "")

    if locale == "fa":
        subject = f"به اپلیکیشن املاک خوش آمدید، {name}!"
        html = f"""
        <html dir="rtl">
        <body style="font-family:'Vazirmatn',Arial,sans-serif;color:#333;direction:rtl;text-align:right">
          <h2>خوش آمدید، {name}!</h2>
          <p>حساب کاربری شما ایجاد شد. همین الان هزاران آگهی تایید شده را مرور کنید.</p>
          <a href="{APP_URL}/fa/properties"
             style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block">
            مرور املاک
          </a>
          <br/><br/><p>— تیم اپلیکیشن املاک</p>
        </body></html>
        """
    else:
        subject = f"Welcome to Real Estate App, {name}!"
        html = f"""
        <html><body style="font-family:Arial,sans-serif;color:#333">
          <h2>Welcome, {name}!</h2>
          <p>Your account has been created. Start browsing thousands of verified listings today.</p>
          <a href="{APP_URL}/en/properties"
             style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block">
            Browse Properties
          </a>
          <br/><br/><p>— The Real Estate Team</p>
        </body></html>
        """
    return subject, html


async def process_email_message(message: aio_pika.IncomingMessage) -> None:
    async with message.process():
        try:
            payload  = json.loads(message.body.decode())
            event    = payload.get("event")
            to_email = payload.get("email")
            locale   = payload.get("locale", "en")
            if locale not in ("en", "fa"):
                locale = "en"

            if not to_email:
                logger.warning("Email message missing 'email' field, skipping")
                return

            if event == "appointment.created":
                subject, html = _render_appointment_email(payload, locale)
            elif event == "user.registered":
                subject, html = _render_welcome_email(payload, locale)
            else:
                logger.debug("Unhandled email event: %s", event)
                return

            await send_email(to_email, subject, html)

        except Exception as exc:
            logger.error("Failed to process email message: %s", exc, exc_info=True)


async def start_email_consumer(connection: aio_pika.RobustConnection) -> None:
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=5)

    queue = await channel.declare_queue(QUEUE_NAME, durable=True)
    logger.info("Email consumer listening on queue: %s", QUEUE_NAME)

    await queue.consume(process_email_message)
