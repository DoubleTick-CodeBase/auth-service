import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
    bindings: () => ({ service: "auth-service" }),
  },
  serializers: {
    err: pino.stdSerializers.err,
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
});

export default logger;
