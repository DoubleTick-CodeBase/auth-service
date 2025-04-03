import { OpenAPIHono } from "@hono/zod-openapi";
import { v4 } from "uuid";
import { sign } from "hono/jwt";
import prisma from "./../../lib/prisma-client.js";
import { checkPassword, hashPassword } from "./../../utils/passwords.js";
import { signin, signup } from "./route.js";

const authRouter = new OpenAPIHono();

authRouter.openapi(signin, async (ctx) => {
  const { email, password } = ctx.req.valid("json");

  if (!process.env.JWT_SECRET) {
    return ctx.text("Internal server error", 500);
  }

  const auth = await prisma.auth.findUnique({
    where: {
      email,
    },
  });

  if (!auth) {
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

    return ctx.json(
      {
        token: token,
        authId: auth.id,
      },
      200
    );
  } else {
    return ctx.text("Invalid password", 403);
  }
});

authRouter.openapi(signup, async (ctx) => {
  const { email, password } = ctx.req.valid("json");

  if (!process.env.JWT_SECRET) {
    return ctx.text("Internal server error", 500);
  }

  const existingAuth = await prisma.auth.findUnique({
    where: { email },
  });

  if (existingAuth) {
    return ctx.text("Auth already exists", 409);
  }

  const hashedPassword = await hashPassword(password);

  const auth = await prisma.auth.create({
    data: {
      id: v4(),
      email,
      password: hashedPassword,
    },
  });

  if (auth) {
    const token = await sign(
      {
        authId: auth.id,
        exp:
          Math.floor(Date.now() / 1000) +
          (Number(process.env.JWT_EXPIRATION) || 1200),
      },
      process.env.JWT_SECRET
    );

    return ctx.json(
      {
        token: token,
        authId: auth.id,
      },
      200
    );
  } else {
    return ctx.text("Internal Server Error", 500);
  }
});

export default authRouter;
