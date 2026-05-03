import { Router } from "express";
import { z } from "zod";

const router = Router();

const Body = z.object({
  prompt: z.string().min(1).max(2000),
  seed: z.number().int().optional(),
});

/**
 * Proxy to Replicate's flux-schnell model. Keeps REPLICATE_API_TOKEN server-side
 * and uses `Prefer: wait` so the request returns synchronously when the
 * prediction finishes (no need for client-side polling).
 *
 * Returns: { imageUrl: string, seed: number }
 */
router.post("/internal/replicate-generate", async (req, res) => {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    res.status(500).json({ error: "ConfigError", message: "REPLICATE_API_TOKEN is not set on the server." });
    return;
  }

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "BadRequest", message: parsed.error.issues[0]?.message ?? "Invalid body" });
    return;
  }

  const seed = parsed.data.seed ?? Math.floor(Math.random() * 1_000_000);

  try {
    const upstream = await fetch(
      "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify({
          input: {
            prompt: parsed.data.prompt,
            seed,
            num_outputs: 1,
            aspect_ratio: "1:1",
            output_format: "jpg",
            output_quality: 90,
            go_fast: true,
          },
        }),
      },
    );

    const data: any = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      req.log.warn({ status: upstream.status, data }, "Replicate API returned non-2xx");
      res.status(502).json({
        error: "UpstreamError",
        message: data?.detail || data?.title || `Replicate returned ${upstream.status}`,
      });
      return;
    }

    if (data.status === "failed" || data.error) {
      res.status(502).json({ error: "GenerationFailed", message: data.error || "Generation failed" });
      return;
    }

    // `output` is either a string or an array of URLs depending on the model.
    const output = data.output;
    const imageUrl: string | undefined = Array.isArray(output) ? output[0] : output;

    if (!imageUrl) {
      // Prediction is still running (rare with Prefer: wait but possible if it
      // exceeds the 60s wait limit). Return the polling URL so the client can
      // continue waiting if needed.
      res.status(202).json({
        error: "Pending",
        message: "Generation is taking longer than expected. Try again.",
        pollUrl: data.urls?.get,
      });
      return;
    }

    res.json({ imageUrl, seed });
  } catch (err: any) {
    req.log.error({ err }, "Replicate proxy failed");
    res.status(502).json({ error: "UpstreamError", message: err?.message ?? "Failed to reach Replicate" });
  }
});

export default router;
