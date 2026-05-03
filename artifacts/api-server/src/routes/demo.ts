import { Router } from "express";
import { z } from "zod";

const router = Router();

/**
 * Public, unauthenticated demo endpoint used by the landing page Live Demo
 * section. Visitors click one of three pre-defined personas and we return
 * what the real /v1/check-face response would look like — without storing
 * anything in the DB, hitting AWS Rekognition, or requiring an API key.
 *
 * Personas are entirely fictional and their portraits are AI-generated.
 */
const PERSONAS = {
  blocked: {
    name: "Aisha Karimi",
    role: "Photographer",
    matchScore: 98.7,
    consentLevel: "BLOCKED" as const,
    note: "Aisha has set her face to BLOCKED. No AI tool may generate images of her, ever.",
  },
  token: {
    name: "Marcus Chen",
    role: "Surgeon",
    matchScore: 96.3,
    consentLevel: "TOKEN_REQUIRED" as const,
    note: "Marcus approves each request manually. We just sent him a notification — your one-time consent token is below.",
  },
  open: {
    name: "Theo Vasquez",
    role: "Indie musician",
    matchScore: 97.1,
    consentLevel: "OPEN" as const,
    note: "Theo allows open editorial use of his likeness for AI generation.",
  },
} as const;

type PersonaKey = keyof typeof PERSONAS;

router.post("/v1/demo/check", async (req, res) => {
  const parsed = z
    .object({ persona: z.enum(["blocked", "token", "open"]) })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "BadRequest", message: "persona must be one of: blocked, token, open" });
    return;
  }

  const p = PERSONAS[parsed.data.persona as PersonaKey];
  const status =
    p.consentLevel === "BLOCKED" ? "blocked" :
    p.consentLevel === "OPEN" ? "open" :
    "token_required";

  res.json({
    status,
    matchScore: p.matchScore,
    consentLevel: p.consentLevel,
    persona: { name: p.name, role: p.role, note: p.note },
    authUrl: status === "token_required"
      ? "https://malamh.app/consent/approve/demo-token-7f3a9b2c"
      : null,
    demo: true,
  });
});

export default router;
