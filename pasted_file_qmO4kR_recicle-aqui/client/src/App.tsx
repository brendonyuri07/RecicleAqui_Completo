import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import MapPage from "./pages/Map";
import NewPoint from "./pages/NewPoint";
import NotFound from "./pages/NotFound";
import PointDetail from "./pages/PointDetail";
import Points from "./pages/Points";
import Profile from "./pages/Profile";

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/mapa" component={MapPage} />
    <Route path="/pontos/novo" component={NewPoint} />
    <Route path="/pontos/:id" component={PointDetail} />
    <Route path="/pontos" component={Points} />
    <Route path="/dashboard" component={Dashboard} />
    <Route path="/perfil" component={Profile} />
    <Route path="/admin" component={Admin} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
