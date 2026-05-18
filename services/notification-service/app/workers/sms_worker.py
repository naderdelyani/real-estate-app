"""
SMS worker — subscribes to the 'notifications.sms' RabbitMQ queue
and sends transactional SMS messages via the Twilio REST API.
"""

import json
import logging
import os
from functools import lru_cache

import aio_pika
from twilio.rest import Client as TwilioClient

logger = logging.getLogger(__name__)

QUEUE_NAME = "notifications.sms"


@lru_cache(maxsize=1)
def _get_twilio_client() -> TwilioClient | None:
    """Returns a cached Twilio client, or None if credentials are not configured."""
    sid   = os.getenv("TWILIO_ACCOUNT_SID")
    token = os.getenv("TWILIO_AUTH_TOKEN")
    if not sid or not token:
        logger.warning("Twilio credentials not set — SMS worker is in dry-run mode")
        return None
    return TwilioClient(sid, token)


FROM_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")


def _build_sms_body(payload: dict) -> str | None:
    """
    Builds an SMS message body for a known event type.
    Returns None if the event type is not handled.
    """
    event = payload.get("event")

    if event == "appointment.created":
        return (
            f"[RealEstate] Your viewing for '{payload.get('propertyTitle', 'the property')}' "
            f"is confirmed for {payload.get('scheduledAt', 'the scheduled time')}."
        )
    if event == "appointment.cancelled":
        return (
            f"[RealEstate] Your viewing appointment for "
            f"'{payload.get('propertyTitle', 'the property')}' has been cancelled."
        )
    if event == "property.sold":
        return "[RealEstate] A property you saved has been marked as sold."

    return None


async def process_sms_message(message: aio_pika.IncomingMessage) -> None:
    """Deserializes a RabbitMQ message and dispatches an SMS via Twilio."""
    async with message.process():
        try:
            payload = json.loads(message.body.decode())
            to      = payload.get("phone")

            if not to:
                logger.debug("SMS message missing 'phone' field, skipping")
                return

            body = _build_sms_body(payload)
            if body is None:
                logger.debug("Unhandled SMS event: %s", payload.get("event"))
                return

            client = _get_twilio_client()
            if client is None:
                logger.info("[dry-run] Would send SMS to %s: %s", to, body)
                return

            msg = client.messages.create(body=body, from_=FROM_NUMBER, to=to)
            logger.info("SMS sent to %s | SID: %s", to, msg.sid)

        except Exception as exc:
            logger.error("Failed to process SMS message: %s", exc, exc_info=True)


async def start_sms_consumer(connection: aio_pika.RobustConnection) -> None:
    """Declares the SMS queue and begins consuming messages."""
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=5)

    queue = await channel.declare_queue(QUEUE_NAME, durable=True)
    logger.info("SMS consumer listening on queue: %s", QUEUE_NAME)

    await queue.consume(process_sms_message)
