import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { Leaf, LogIn, UserPlus } from "lucide-react";
import AppShell from "@/components/AppShell";
import { trpc } from "@/lib/trpc";

export default function Login() {
  const [location, navigate] = useLocation();
  const register = location === "/cadastro";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const utils = trpc.useUtils();
  const onSuccess = async () => {
    setPassword("");
    await utils.invalidate();
    navigate("/dashboard");
  };
  const login = trpc.auth.login.useMutation({ onSuccess });
  const signup = trpc.auth.register.useMutation({ onSuccess });
  const pending = login.isPending || signup.isPending;
  const error = register ? signup.error : login.error;
  useEffect(() => {
    setPassword("");
  }, [register]);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (register)
      signup.mutate({ name: name.trim(), email: email.trim(), password });
    else login.mutate({ email: email.trim(), password });
  }
  return (
    <AppShell>
      <div className="gradient-hero flex min-h-[70vh] items-center justify-center px-4 py-12">
        <section className="card-soft w-full max-w-md p-6 sm:p-8">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Leaf className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-3xl font-bold">
            {register ? "Criar conta" : "Bem-vindo de volta"}
          </h1>
          <p className="mb-7 mt-2 text-sm text-muted-foreground">
            {register
              ? "Faça parte de uma cidade mais sustentável."
              : "Entre para cuidar da sua comunidade."}
          </p>
          <form onSubmit={submit} className="space-y-4">
            {register && (
              <label className="block text-sm font-medium">
                Nome
                <input
                  className="mt-2 w-full rounded-lg border border-input bg-background p-3"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={180}
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </label>
            )}
            <label className="block text-sm font-medium">
              E-mail
              <input
                className="mt-2 w-full rounded-lg border border-input bg-background p-3"
                type="email"
                autoComplete="email"
                required
                maxLength={320}
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              Senha
              <input
                className="mt-2 w-full rounded-lg border border-input bg-background p-3"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                required
                minLength={register ? 6 : 1}
                maxLength={128}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </label>
            {register && (
              <p className="text-xs text-muted-foreground">
                Use pelo menos 6 caracteres.
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
              >
                {error.message}
              </p>
            )}
            <button disabled={pending} className="btn-primary w-full">
              {register ? (
                <UserPlus className="h-4 w-4" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {pending ? "Aguarde…" : register ? "Criar conta" : "Entrar"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {register ? "Já tem uma conta?" : "Ainda não tem conta?"}{" "}
            <Link
              href={register ? "/entrar" : "/cadastro"}
              className="font-semibold text-primary underline underline-offset-4"
            >
              {register ? "Entrar" : "Cadastre-se"}
            </Link>
          </p>
        </section>
      </div>
    </AppShell>
  );
}
