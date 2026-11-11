import { Link } from "wouter";
import { MapPinOff } from "lucide-react";
import AppShell from "@/components/AppShell";

export default function NotFound() {
  return (
    <AppShell>
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <MapPinOff className="mx-auto h-12 w-12 text-primary" />
        <p className="mt-5 text-sm font-bold tracking-widest text-muted-foreground">
          404
        </p>
        <h1 className="mt-2 text-3xl font-bold">Página não encontrada</h1>
        <p className="mt-3 text-muted-foreground">
          Este endereço não existe ou foi alterado.
        </p>
        <Link href="/" className="btn-primary mt-8">
          Voltar ao início
        </Link>
      </div>
    </AppShell>
  );
}
