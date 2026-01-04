import { Router } from "express";

const router = Router();

// GET /api/forecasting/:userId/explain?top=8
router.get("/:userId/explain", async (req, res) => {
  try {
    const userId = req.params.userId;
    const top = Math.max(3, Math.min(Number(req.query.top || 8), 15));

    const mlBase = process.env.ML_SERVICE_URL || "http://localhost:8001";
    const url = `${mlBase}/explain/${encodeURIComponent(userId)}?top=${top}`;

    const r = await fetch(url);
    const text = await r.text();

    if (!r.ok) {
      return res.status(r.status).send(text);
    }

    // Forward JSON exactly
    res.setHeader("Content-Type", "application/json");
    return res.send(text);
  } catch (err) {
    console.error("Explain proxy error:", err);
    return res.status(500).json({ message: "Failed to fetch explainability" });
  }
});

export default router;
