import "dotenv/config";
import express from "express";
import cors from "cors";
import agentRoutes from "./src/routes/agentRoutes.js";

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigin =
  process.env.NODE_ENV === "production"
    ? process.env.CORS_ORIGIN || "*"   // set CORS_ORIGIN in Render dashboard to lock down later
    : "http://localhost:5173";
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

app.use("/api", agentRoutes);

app.get("/health", (_, res) => res.json({ status: "ok", model: process.env.AI_PROVIDER || "claude" }));

app.listen(PORT, () => {
  console.log(`Field Observation Agent backend running on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("WARNING: ANTHROPIC_API_KEY is not set. Set it in backend/.env");
  }
});
