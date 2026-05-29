type AuthUser = {
  id: number;
  username: string;
  email: string;
  status: string;
  createdAt: string | Date;
};

type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export function saveAuth(payload: AuthPayload) {
  localStorage.setItem("accessToken", payload.accessToken);
  localStorage.setItem("refreshToken", payload.refreshToken);
  localStorage.setItem("user", JSON.stringify(payload.user));
}

