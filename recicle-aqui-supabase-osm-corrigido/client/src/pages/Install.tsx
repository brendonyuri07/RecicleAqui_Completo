import { CheckCircle2, Download, Smartphone } from "lucide-react";
import { Link } from "wouter";
import AppShell from "@/components/AppShell";
import { useInstall } from "@/contexts/InstallContext";

export default function Install() {
  const { canInstall, installed, installing, message, install } = useInstall();
  return <AppShell><div className="gradient-hero px-4 py-10 sm:py-16">
    <section className="mx-auto max-w-2xl">
      <img src="/icons/icon-192.png" alt="" width="80" height="80" className="rounded-2xl" />
      <h1 className="mt-5 text-3xl font-bold sm:text-4xl">Recicle Aqui no seu celular</h1>
      <p className="mt-3 leading-relaxed text-muted-foreground">Abra seus pontos de coleta e o chat direto da tela inicial, em uma janela própria. Use a mesma conta do site.</p>
      {installed ? <div role="status" className="mt-6 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4"><CheckCircle2 className="h-6 w-6 shrink-0 text-primary" /><span>O app já está aberto ou foi instalado neste navegador.</span></div>
        : canInstall ? <button className="btn-primary mt-6" disabled={installing} onClick={() => void install()}><Download className="h-5 w-5" />{installing ? "Aguarde…" : "Instalar Recicle Aqui"}</button>
        : <p className="mt-6 text-sm text-muted-foreground">Siga os passos abaixo para adicionar o app à tela inicial.</p>}
      {message && <p role="status" className="mt-4 text-sm text-primary">{message}</p>}
      {!installed && <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <article className="card-soft p-5"><h2 className="flex items-center gap-2 text-lg font-semibold"><Smartphone className="h-5 w-5 text-primary" />Android</h2><ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-muted-foreground"><li>Abra este site no Chrome.</li><li>Toque no menu de três pontos.</li><li>Escolha <strong className="text-foreground">Instalar app</strong> ou <strong className="text-foreground">Adicionar à tela inicial</strong> e confirme.</li></ol></article>
        <article className="card-soft p-5"><h2 className="flex items-center gap-2 text-lg font-semibold"><Smartphone className="h-5 w-5 text-primary" />iPhone</h2><ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-muted-foreground"><li>Abra este site no Safari.</li><li>Toque em <strong className="text-foreground">Compartilhar</strong> e em <strong className="text-foreground">Adicionar à Tela de Início</strong>.</li><li>Se aparecer, ative <strong className="text-foreground">Abrir como App da Web</strong> e toque em <strong className="text-foreground">Adicionar</strong>.</li></ol></article>
      </div>}
      <p className="mt-6 text-sm text-muted-foreground">Você precisa de internet para consultar pontos, acessar sua conta e enviar mensagens. Se estiver sem conexão ao abrir, o app mostrará um aviso.</p>
      <Link href="/mapa" className="btn-outline mt-6">Explorar o mapa</Link>
    </section>
  </div></AppShell>;
}
