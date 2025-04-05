import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
    bindings: () => ({ service: "auth-service" }),
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      headers: {
        "user-agent": req.headers["user-agent"],
        "content-type": req.headers["content-type"],
        "content-length": req.headers["content-length"],
      },
    }),
    res: (res) => ({
      status: res.status,
    }),
  },
  timestamp: () => `,"@timestamp":"${new Date().toISOString()}"`,
});

export default logger;
