import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

export const protectedProcedure = o.use(({ context, next }) => {
  if (!context.auth) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Bạn cần đăng nhập để thực hiện hành động này",
    });
  }

  return next({
    context: {
      auth: context.auth,
    },
  });
});
