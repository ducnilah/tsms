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
import { Loader2, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { saveAuth } from "@/utils/auth-storage";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/register")({
  component: RegisterRoute,
});

function RegisterRoute() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const registerMutation = useMutation(
    orpc["auth.register"].mutationOptions({
      onSuccess: (data) => {
        saveAuth(data);
        toast.success("Tao tai khoan thanh cong");
        navigate({ to: "/todos" });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    registerMutation.mutate({ username, email, password });
  };

  return (
    <main className="min-h-full bg-[linear-gradient(120deg,var(--background),var(--muted)_42%,var(--secondary))] px-4 py-10">
      <section className="mx-auto flex min-h-[calc(100svh-8rem)] w-full max-w-5xl items-center">
        <div className="grid w-full gap-8 md:grid-cols-[380px_1fr] md:items-center">
          <Card>
            <CardHeader>
              <CardTitle>Register</CardTitle>
              <CardDescription>Create a user through auth.register.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="tester1"
                    disabled={registerMutation.isPending}
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="tester1@gmail.com"
                    disabled={registerMutation.isPending}
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 6 characters"
                    disabled={registerMutation.isPending}
                    minLength={6}
                    required
                  />
                </div>

                <Button type="submit" disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? <Loader2 data-icon="inline-start" /> : null}
                  Create account
                </Button>
              </form>

              <p className="mt-4 text-xs text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-foreground underline underline-offset-4">
                  Login
                </Link>
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-5 md:items-end md:text-right">
            <div className="inline-flex w-fit items-center gap-2 border bg-background px-3 py-1 text-xs text-muted-foreground">
              <UserPlus data-icon="inline-start" />
              First session
            </div>
            <div className="flex flex-col gap-3">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-normal md:text-6xl">
                Create an account and open a session.
              </h1>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                The backend returns an access token and a refresh token, then stores the hashed
                refresh token in the sessions table.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
