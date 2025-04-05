import { OpenAPIHono } from "@hono/zod-openapi";
import { v4 } from "uuid";
import { sign } from "hono/jwt";
import prisma from "$/lib/prisma-client.js";
import { checkPassword, hashPassword } from "$/utils/passwords.js";
import { signin, signup } from "$/routes/auth/route.js";
import logger from "$/utils/logger.js";

const authRouter = new OpenAPIHono();

authRouter.use("*", async (c, next) => {
  const start = Date.now();
  const requestId = crypto.randomUUID();

  logger.info({
    requestId,
    operation: c.req.path,
    method: c.req.method,
    message: "Request started",
  });

  await next();

  const duration = Date.now() - start;
  logger.info({
    requestId,
    operation: c.req.path,
    method: c.req.method,
    durationMs: duration,
    status: c.res.status,
    message: "Request completed",
  });
});

authRouter.openapi(signin, async (ctx) => {
  const requestId = crypto.randomUUID();
  const { email, password } = ctx.req.valid("json");

  logger.debug({
    requestId,
    operation: "signin",
    email: email,
    message: "Signin attempt started",
  });

  if (!process.env.JWT_SECRET) {
    logger.error({
      requestId,
      operation: "signin",
      message: "JWT_SECRET not configured",
    });
    return ctx.text("Internal server error", 500);
  }

  try {
    const auth = await prisma.auth.findUnique({
      where: { email },
    });

    if (!auth) {
      logger.warn({
        requestId,
        operation: "signin",
        email,
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
        requestId,
        operation: "signin",
        authId: auth.id,
        message: "Successful authentication",
      });

      return ctx.json({ token, authId: auth.id }, 200);
    } else {
      logger.warn({
        requestId,
        operation: "signin",
        email,
        message: "Invalid password provided",
      });
      return ctx.text("Invalid password", 403);
    }
  } catch (error) {
    logger.error({
      requestId,
      operation: "signin",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      message: "Authentication error",
    });
    return ctx.text("Internal Server Error", 500);
  }
});

authRouter.openapi(signup, async (ctx) => {
  const requestId = crypto.randomUUID();
  const { email, password } = ctx.req.valid("json");

  logger.debug({
    requestId,
    operation: "signup",
    email,
    message: "Signup attempt started",
  });

  if (!process.env.JWT_SECRET) {
    logger.error({
      requestId,
      operation: "signup",
      message: "JWT_SECRET not configured",
    });
    return ctx.text("Internal server error", 500);
  }

  try {
    const existingAuth = await prisma.auth.findUnique({ where: { email } });

    if (existingAuth) {
      logger.warn({
        requestId,
        operation: "signup",
        email,
        message: "Auth already exists",
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
      requestId,
      operation: "signup",
      authId: auth.id,
      message: "New user created successfully",
    });

    return ctx.json({ token, authId: auth.id }, 200);
  } catch (error) {
    logger.error({
      requestId,
      operation: "signup",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      message: "User creation failed",
    });
    return ctx.text("Internal Server Error", 500);
  }
});

export default authRouter;
