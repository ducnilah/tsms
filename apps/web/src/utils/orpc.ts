import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import type { AppRouterClient } from "@tsms/api/routers/index";
import { env } from "@tsms/env/web";
import { toast } from "sonner";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Một số query như auth.me ở trang login/register có thể fail "đúng kỳ vọng"
      // khi user chưa đăng nhập. Cho phép meta flag để tránh spam toast không cần thiết.
      if (query.meta?.skipErrorToast) {
        return;
      }

      toast.error(`Error: ${error.message}`, {
        action: {
          label: "retry",
          onClick: query.invalidate,
        },
      });
    },
  }),
});

export const link = new RPCLink({
  url: `${env.VITE_SERVER_URL}/rpc`,

  // Không tự gắn Authorization header nữa.
  // Thay vào đó, yêu cầu browser gửi kèm cookie auth.
  fetch: (request, init) =>
    fetch(request, {
      ...init,
      credentials: "include",
    }),
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);