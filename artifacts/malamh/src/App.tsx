import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, useClerk, useAuth } from "@clerk/react";
import { Redirect } from "wouter";
import { dark } from "@clerk/themes";
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
import Webhooks from "@/pages/dashboard/Webhooks";
import Share from "@/pages/dashboard/Share";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL as string | undefined;

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

const clerkAppearance = {
  theme: dark,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "#4d7cff",
    colorForeground: "#f0f0f5",
    colorMutedForeground: "#8888a0",
    colorDanger: "#ff4d5e",
    colorBackground: "#111118",
    colorInput: "#0a0a0f",
    colorInputForeground: "#f0f0f5",
    colorNeutral: "#1e1e2e",
    fontFamily: "'Satoshi', 'Inter', system-ui, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-[#111118] border border-[#1e1e2e] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none !px-8 !py-8",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "!text-[#f0f0f5] !text-2xl !font-semibold !tracking-tight",
    headerSubtitle: "!text-[#8888a0] !text-sm",
    socialButtonsBlockButton:
      "!bg-[#0a0a0f] !border !border-[#1e1e2e] !text-[#f0f0f5] !rounded-lg",
    socialButtonsBlockButtonText: "!text-[#f0f0f5] !font-medium",
    formFieldLabel: "!text-[#f0f0f5] !text-xs !font-semibold !uppercase !tracking-wider",
    formFieldInput:
      "!bg-[#0a0a0f] !border !border-[#1e1e2e] !text-[#f0f0f5] !rounded-lg !px-4 !py-3",
    formButtonPrimary:
      "!bg-[#4d7cff] hover:!bg-[#3d6cef] !text-white !font-semibold !rounded-lg !py-3 !shadow-[0_0_30px_rgba(77,124,255,0.3)]",
    footerActionText: "!text-[#8888a0] !text-sm",
    footerActionLink: "!text-[#4d7cff] hover:!text-[#7d4dff] !font-medium",
    dividerText: "!text-[#555566] !text-xs !uppercase !tracking-wider",
    dividerLine: "!bg-[#1e1e2e]",
    identityPreviewEditButton: "!text-[#4d7cff]",
    formFieldSuccessText: "!text-[#00d48a]",
    alertText: "!text-[#f0f0f5]",
    alert: "!bg-[#1a1a24] !border !border-[#1e1e2e] !rounded-lg",
    otpCodeFieldInput:
      "!bg-[#0a0a0f] !border !border-[#1e1e2e] !text-[#f0f0f5] !rounded-lg",
    formFieldRow: "!gap-2",
    main: "!gap-5",
    logoBox: "!justify-center !mb-4",
    logoImage: "!h-10 !w-10",
  },
};

function SignInPage() {
  const { isLoaded, isSignedIn } = useAuth();
  if (isLoaded && isSignedIn) return <Redirect to="/dashboard/overview" />;
  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "var(--bg-primary)" }}
    >
      <div
        className="mesh-blob"
        style={{
          width: 600,
          height: 600,
          background: "rgba(77,124,255,0.18)",
          top: "-15%",
          left: "-10%",
          animation: "mh-orbit-1 28s ease-in-out infinite",
        }}
      />
      <div
        className="mesh-blob"
        style={{
          width: 500,
          height: 500,
          background: "rgba(125,77,255,0.14)",
          bottom: "-15%",
          right: "-10%",
          animation: "mh-orbit-2 32s ease-in-out infinite",
        }}
      />
      <div className="relative z-10 anim-fade-up">
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      </div>
    </div>
  );
}

function SignUpPage() {
  const { isLoaded, isSignedIn } = useAuth();
  if (isLoaded && isSignedIn) return <Redirect to="/dashboard/overview" />;
  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "var(--bg-primary)" }}
    >
      <div
        className="mesh-blob"
        style={{
          width: 600,
          height: 600,
          background: "rgba(77,124,255,0.18)",
          top: "-15%",
          right: "-10%",
          animation: "mh-orbit-1 28s ease-in-out infinite",
        }}
      />
      <div
        className="mesh-blob"
        style={{
          width: 500,
          height: 500,
          background: "rgba(0,212,138,0.10)",
          bottom: "-15%",
          left: "-10%",
          animation: "mh-orbit-2 32s ease-in-out infinite",
        }}
      />
      <div className="relative z-10 anim-fade-up">
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      </div>
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location]);
  return null;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
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
      <Route path="/dashboard/webhooks" component={Webhooks} />
      <Route path="/dashboard/share" component={Share} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      signInFallbackRedirectUrl={`${basePath}/dashboard/overview`}
      signUpFallbackRedirectUrl={`${basePath}/dashboard/overview`}
      localization={{
        signIn: {
          start: { title: "Welcome back", subtitle: "Sign in to manage your facial consent." },
        },
        signUp: {
          start: { title: "Create your account", subtitle: "Free forever. Take control of your face online." },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <ScrollToTop />
          <AppRoutes />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
