import { OpenAPIHono } from "@hono/zod-openapi";
import { v4 } from "uuid";
import { sign } from "hono/jwt";
import prisma from "../../lib/prisma-client.js";
import { checkPassword, hashPassword } from "../../utils/passwords.js";
import { signin, signup } from "./route.js";
import logger from "../../utils/logger.js";

const authRouter = new OpenAPIHono();

authRouter.openapi(signin, async (ctx) => {
  const requestId = crypto.randomUUID();
  const start = Date.now();

  const { email, password } = ctx.req.valid("json");

  const method = ctx.req.raw.method;

  if (!process.env.JWT_SECRET) {
    logger.error({
      method,
      requestId,
      operation: "signin",
      durationMs: Date.now() - start,
      message: "JWT_SECRET not configured",
    });
    return ctx.text("Internal server error", 500);
  }

  try {
    const auth = await prisma.auth.findUnique({
      where: { email },
    });

    if (!auth) {
      logger.error({
        method,
        requestId,
        email,
        operation: "signin",
        durationMs: Date.now() - start,
        status: 404,
        message: "Auth record not found",
      });
      return ctx.text("Auth record not found", 404);
    }

    const truePassword = await checkPassword(password, auth?.password);

    if (truePassword) {
      const token = await sign(
        {
          userId: auth.id,
          exp:
            Math.floor(Date.now() / 1000) +
            (Number(process.env.JWT_EXPIRATION) || 1200),
        },
        process.env.JWT_SECRET
      );

      logger.info({
        method,
        requestId,
        email,
        authId: auth.id,
        operation: "signin",
        durationMs: Date.now() - start,
        status: 200,
        message: "Successful authentication",
      });

      return ctx.json({ token, authId: auth.id }, 200);
    } else {
      logger.warn({
        method,
        requestId,
        email,
        operation: "signin",
        authId: auth.id,
        durationMs: Date.now() - start,
        status: 403,
        message: "Invalid password provided",
      });
      return ctx.text("Invalid password", 403);
    }
  } catch (error) {
    logger.error({
      method,
      requestId,
      operation: "signin",
      email,
      durationMs: Date.now() - start,
      status: 500,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      message: "Authentication error",
    });
    return ctx.text("Internal Server Error", 500);
  }
});

authRouter.openapi(signup, async (ctx) => {
  const requestId = crypto.randomUUID();
  const start = Date.now();

  const { email, password } = ctx.req.valid("json");

  const method = ctx.req.raw.method;

  if (!process.env.JWT_SECRET) {
    logger.error({
      method,
      requestId,
      operation: "signup",
      durationMs: Date.now() - start,
      message: "JWT_SECRET not configured",
    });
    return ctx.text("Internal server error", 500);
  }

  try {
    const existingAuth = await prisma.auth.findUnique({ where: { email } });

    if (existingAuth) {
      logger.warn({
        method,
        requestId,
        operation: "signup",
        email,
        durationMs: Date.now() - start,
        status: 409,
        message: "Email already exists",
      });
      return ctx.text("Auth already exists", 409);
    }

    const hashedPassword = await hashPassword(password);
    const auth = await prisma.auth.create({
      data: { id: v4(), email, password: hashedPassword },
    });

    const token = await sign(
      {
        authId: auth.id,
        exp:
          Math.floor(Date.now() / 1000) +
          (Number(process.env.JWT_EXPIRATION) || 1200),
      },
      process.env.JWT_SECRET
    );

    logger.info({
      method,
      requestId,
      operation: "signup",
      authId: auth.id,
      email,
      durationMs: Date.now() - start,
      status: 200,
      message: "Successful user creation",
    });

    return ctx.json({ token, authId: auth.id }, 200);
  } catch (error) {
    logger.error({
      method,
      requestId,
      operation: "signup",
      email,
      durationMs: Date.now() - start,
      status: 500,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      message: "User creation error",
    });
    return ctx.text("Internal Server Error", 500);
  }
});

export default authRouter;
