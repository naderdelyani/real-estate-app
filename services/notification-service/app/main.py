"""Notification service — FastAPI app with background RabbitMQ consumers."""

import asyncio
import logging
from contextlib import asynccontextmanager

import aio_pika
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.workers.email_worker import start_email_consumer
from app.workers.sms_worker   import start_sms_consumer

logger = logging.getLogger(__name__)

RABBITMQ_URL = __import__("os").getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq/")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Connects to RabbitMQ and launches background consumer tasks on startup."""
    try:
        connection = await aio_pika.connect_robust(RABBITMQ_URL)
        app.state.rmq_connection = connection

        asyncio.create_task(start_email_consumer(connection))
        asyncio.create_task(start_sms_consumer(connection))
        logger.info("RabbitMQ consumers started")
    except Exception as exc:
        logger.warning("Could not connect to RabbitMQ at startup: %s", exc)

    yield

    if hasattr(app.state, "rmq_connection"):
        await app.state.rmq_connection.close()


app = FastAPI(
    title="Notification Service",
    description="Email and SMS notifications via RabbitMQ workers",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
async def health_check():
    """Returns service liveness status."""
    return {"status": "ok", "service": "notification-service", "version": "1.0.0"}
