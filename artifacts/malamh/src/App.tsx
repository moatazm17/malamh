import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Playground from "@/pages/Playground";
import AiStudio from "@/pages/AiStudio";
import Docs from "@/pages/Docs";
import Pricing from "@/pages/Pricing";
import PublicProfile from "@/pages/PublicProfile";
import ConsentApprove from "@/pages/ConsentApprove";
import DashboardOverview from "@/pages/dashboard/Overview";
import RegisterFace from "@/pages/dashboard/RegisterFace";
import FaceDetail from "@/pages/dashboard/FaceDetail";
import ApiKeys from "@/pages/dashboard/ApiKeys";
import ApiTester from "@/pages/dashboard/ApiTester";
import Monitor from "@/pages/dashboard/Monitor";
import Settings from "@/pages/dashboard/Settings";
import Activity from "@/pages/dashboard/Activity";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/playground" component={Playground} />
      <Route path="/ai-studio" component={AiStudio} />
      <Route path="/docs" component={Docs} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/u/:username" component={PublicProfile} />
      <Route path="/consent/approve/:token" component={ConsentApprove} />
      <Route path="/dashboard" component={DashboardOverview} />
      <Route path="/dashboard/overview" component={DashboardOverview} />
      <Route path="/dashboard/register-face" component={RegisterFace} />
      <Route path="/dashboard/face/:id" component={FaceDetail} />
      <Route path="/dashboard/api-keys" component={ApiKeys} />
      <Route path="/dashboard/api-test" component={ApiTester} />
      <Route path="/dashboard/monitor" component={Monitor} />
      <Route path="/dashboard/settings" component={Settings} />
      <Route path="/dashboard/activity" component={Activity} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
