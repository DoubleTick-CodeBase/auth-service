import { z, createRoute } from "@hono/zod-openapi";

export const signin = createRoute({
  method: "post",
  path: "/signin",
  tags: ["Auth"],
  description:
    "Responds with the JWT access token. Can be accessed unauthenticated.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            email: z
              .string()
              .email()
              .openapi({ example: "example@example.com" }),
            password: z.string().min(8).openapi({ example: "password" }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "successful signin",
      content: {
        "application/json": {
          schema: z
            .object({
              token: z.string().openapi({
                example:
                  "eyJSb2xlIjoiQWRtaW4iLCJJc3N1ZXIiOiJJc3N1ZXIiLCJVc2VybmFtZSI6IkphdmFJblVzZSIsImV4cCI6MTczNTE0MDk3NiwiaWF0IjoxNzM1MTQwOTc2fQ",
              }),
              authId: z
                .string()
                .openapi({ example: "c9d2841e-7696-4360-bce4-9f9f3e2469cd" }),
            })
            .openapi("AuthResponse"),
        },
      },
    },
    403: {
      description: "Invalid password",
    },
    404: {
      description: "Auth record not found",
    },
    500: {
      description: "JWT secret not set",
    },
  },
});

export const signup = createRoute({
  method: "post",
  path: "/signup",
  tags: ["Auth"],
  description:
    "Signs up a new account and returns an access token. Can be accessed unauthenticated.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            email: z
              .string()
              .email()
              .openapi({ example: "example@example.com" }),
            password: z.string().min(8).openapi({ example: "password" }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "successful signup",
      content: {
        "application/json": {
          schema: z
            .object({
              token: z.string().openapi({
                example:
                  "eyJSb2xlIjoiQWRtaW4iLCJJc3N1ZXIiOiJJc3N1ZXIiLCJVc2VybmFtZSI6IkphdmFJblVzZSIsImV4cCI6MTczNTE0MDk3NiwiaWF0IjoxNzM1MTQwOTc2fQ",
              }),
              authId: z
                .string()
                .openapi({ example: "c9d2841e-7696-4360-bce4-9f9f3e2469cd" }),
            })
            .openapi("AuthResponse"),
        },
      },
    },
    409: {
      description: "Auth already exists",
    },
    500: {
      description: "Internal Server Error",
    },
  },
});
