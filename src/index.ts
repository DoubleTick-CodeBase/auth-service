import { serve } from "@hono/node-server";
import { OpenAPIHono } from "@hono/zod-openapi";

import { jwt } from "hono/jwt";
import { cors } from "hono/cors";
import type { JwtVariables } from "hono/jwt";

type Variables = JwtVariables;

const app = new OpenAPIHono<{ Variables: Variables }>();
app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

app.use("*", (c, next) => {
  const corsMiddleware = cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [],
  });
  return corsMiddleware(c, next);
});

app.get("/", (c) => {
  return c.text("Server is alive!");
});

app.doc("/openapi", {
  openapi: "3.0.0",
  info: {
    version: "0.0.1",
    title: "Template hono api",
  },
});

const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error("JWT Token not set");
}
app.use(
  "*",
  jwt({
    secret: secret,
  })
);

const port = Number(process.env.PORT) || 3000;
console.log(`Server is running on http://localhost:${port}`);
serve({
  fetch: app.fetch,
  port,
});
