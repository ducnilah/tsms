import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@tsms/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@tsms/ui/components/card";
import { Input } from "@tsms/ui/components/input";
import { Label } from "@tsms/ui/components/label";
import { KeyRound, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { saveAuth } from "@/utils/auth-storage";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/login")({
  component: LoginRoute,
});

function LoginRoute() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation(
    orpc["auth.login"].mutationOptions({
      onSuccess: (data) => {
        saveAuth(data);
        toast.success("Dang nhap thanh cong");
        navigate({ to: "/todos" });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_top_left,var(--muted),transparent_34%),linear-gradient(135deg,var(--background),var(--secondary))] px-4 py-10">
      <section className="mx-auto flex min-h-[calc(100svh-8rem)] w-full max-w-5xl items-center">
        <div className="grid w-full gap-8 md:grid-cols-[1fr_380px] md:items-center">
          <div className="flex flex-col gap-5">
            <div className="inline-flex w-fit items-center gap-2 border bg-background px-3 py-1 text-xs text-muted-foreground">
              <KeyRound data-icon="inline-start" />
              TSMS Auth
            </div>
            <div className="flex flex-col gap-3">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-normal md:text-6xl">
                Sign in to your workspace.
              </h1>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                This page calls the oRPC auth.login procedure and stores the returned access and
                refresh tokens in localStorage for local learning.
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription>Use an account created through auth.register.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="tester1@gmail.com"
                    disabled={loginMutation.isPending}
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="123456"
                    disabled={loginMutation.isPending}
                    required
                  />
                </div>

                <Button type="submit" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? <Loader2 data-icon="inline-start" /> : null}
                  Login
                </Button>
              </form>

              <p className="mt-4 text-xs text-muted-foreground">
                Need an account?{" "}
                <Link to="/register" className="text-foreground underline underline-offset-4">
                  Register
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
