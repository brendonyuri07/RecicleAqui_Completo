import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallState = {
  canInstall: boolean;
  installed: boolean;
  installing: boolean;
  message: string;
  install: () => Promise<void>;
};
const InstallContext = createContext<InstallState | null>(null);

export function InstallProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const display = window.matchMedia("(display-mode: standalone)");
    const updateDisplay = () => setInstalled(display.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
      setMessage("");
    };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    updateDisplay();
    display.addEventListener("change", updateDisplay);
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      display.removeEventListener("change", updateDisplay);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!prompt || installing) return;
    setInstalling(true);
    setMessage("");
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setMessage(choice.outcome === "accepted" ? "Instalação solicitada. Aguarde a confirmação do navegador." : "Você pode instalar depois pelo menu do navegador.");
    } catch {
      setMessage("Não foi possível abrir a instalação. Use o menu do navegador para adicionar o app.");
    } finally {
      setPrompt(null);
      setInstalling(false);
    }
  };
  return <InstallContext.Provider value={{ canInstall: Boolean(prompt), installed, installing, message, install }}>{children}</InstallContext.Provider>;
}

export function useInstall() {
  const context = useContext(InstallContext);
  if (!context) throw new Error("InstallProvider não encontrado.");
  return context;
}
