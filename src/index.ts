import { serve } from "@hono/node-server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { jwt } from "hono/jwt";
import { cors } from "hono/cors";
import { type JwtVariables } from "hono/jwt";

import authRouter from "./routes/auth/index.js";

type Variables = JwtVariables;

const app = new OpenAPIHono<{ Variables: Variables }>();

// JWT setup
const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error("JWT_SECRET not set");
}

// Middlewares
app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
  type: "http",
  scheme: "bearer",
});
app.use("*", cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || [] }));
app.use("/jwt/*", jwt({ secret })); // Protect auth routes

// imported routes
app.route("/auth", authRouter);

// Routes
app.get("/", (c) => c.text("Server is alive!"));

/**
 * Check if JWT token is expired
 */
app.get("/jwt/check", async (c) => {
  const token = c.get("jwtPayload");
  const currentTime = Math.floor(Date.now() / 1000);

  if (token.exp && token.exp < currentTime) {
    return c.json({ valid: false, message: "Token has expired" }, 401);
  }

  return c.json({ valid: true, expiresIn: token.exp - currentTime });
});

// Documentation and server start
app.doc("/openapi", {
  openapi: "3.0.0",
  info: {
    version: "0.0.1",
    title: "JWT Management API",
  },
});

const port = 3000;
console.log(`Server is running on http://localhost:${port}`);
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" });
