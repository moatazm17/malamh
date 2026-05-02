import { PublicLayout } from "@/components/layout/PublicLayout";
import { Link } from "wouter";
import { Terminal, Shield, Zap, Lock } from "lucide-react";

export default function AiStudio() {
  return (
    <PublicLayout>
      <div className="container mx-auto max-w-3xl px-4 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Terminal className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-3">AI Studio</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Tools and resources for AI developers integrating Malamh into their image-generation pipelines.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {[
            { icon: Shield, title: "Consent Middleware", body: "Drop-in Express / FastAPI middleware that checks consent before your model runs. Open source on GitHub." },
            { icon: Zap, title: "Batch API", body: "Check up to 100 face IDs in a single request. Ideal for pre-generation validation queues." },
            { icon: Lock, title: "Webhook Events", body: "Receive real-time events when a user's consent level changes. No more polling." },
            { icon: Terminal, title: "SDKs", body: "Official TypeScript and Python SDKs. pip install malamh or npm install @malamh/client." },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="surface p-6 flex flex-col gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.body}</p>
              </div>
            );
          })}
        </div>

        <div className="surface p-8 text-center border-primary/20 bg-primary/5">
          <h2 className="text-xl font-bold mb-3">Ready to integrate?</h2>
          <p className="text-muted-foreground mb-6">Create a free account and grab your API key in under a minute.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="btn btn-primary h-11 px-6">Create free account</Link>
            <Link href="/docs" className="btn btn-ghost border border-border/50 h-11 px-6">Read the docs</Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
