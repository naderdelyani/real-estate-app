'use strict';

const amqplib = require('amqplib');

let channel = null;

/** Returns a cached AMQP channel, creating one if it doesn't exist. */
async function getChannel() {
  if (channel) return channel;
  const conn = await amqplib.connect(process.env.RABBITMQ_URL ?? 'amqp://localhost');
  conn.on('error', (err) => {
    console.error('[property-service] RabbitMQ connection error:', err.message);
    channel = null;
  });
  channel = await conn.createChannel();
  return channel;
}

/**
 * Publishes a JSON event to the default exchange with the given routing key.
 * Silently no-ops if RabbitMQ is unavailable to avoid blocking the HTTP response.
 *
 * @param {string} routingKey - e.g. 'property.created' or 'appointment.created'
 * @param {object} payload    - Event data (will be JSON-serialised)
 */
async function publishEvent(routingKey, payload) {
  const ch = await getChannel();
  const exchange = 'real_estate_events';
  await ch.assertExchange(exchange, 'topic', { durable: true });
  ch.publish(
    exchange,
    routingKey,
    Buffer.from(JSON.stringify({ event: routingKey, ...payload, ts: new Date().toISOString() })),
    { persistent: true },
  );
}

module.exports = { publishEvent };
