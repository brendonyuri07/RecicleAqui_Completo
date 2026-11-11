import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { InstallProvider } from "./contexts/InstallContext";
import Login from "./pages/Login";
const Admin = lazy(() => import("./pages/Admin"));
const EditPoint = lazy(() => import("./pages/EditPoint"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
import Home from "./pages/Home";
const MapPage = lazy(() => import("./pages/Map"));
const NewPoint = lazy(() => import("./pages/NewPoint"));
import NotFound from "./pages/NotFound";
const PointDetail = lazy(() => import("./pages/PointDetail"));
const Points = lazy(() => import("./pages/Points"));
const Profile = lazy(() => import("./pages/Profile"));
const Install = lazy(() => import("./pages/Install"));
const RecyclingGuide = lazy(() => import("./pages/RecyclingGuide"));

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/entrar" component={Login} />
      <Route path="/cadastro" component={Login} />
      <Route path="/instalar" component={Install} />
      <Route path="/mapa" component={MapPage} />
      <Route path="/como-reciclar" component={RecyclingGuide} />
      <Route path="/pontos/novo" component={NewPoint} />
      <Route path="/admin/pontos/:id/editar" component={EditPoint} />
      <Route path="/pontos/:id" component={PointDetail} />
      <Route path="/pontos" component={Points} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/perfil" component={Profile} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <ErrorBoundary>
        <InstallProvider>
          <TooltipProvider>
            <Toaster />
            <Suspense
              fallback={
                <div
                  role="status"
                  className="grid min-h-screen place-items-center text-muted-foreground"
                >
                  Carregando página…
                </div>
              }
            >
              <Router />
            </Suspense>
          </TooltipProvider>
        </InstallProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
