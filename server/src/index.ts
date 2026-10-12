import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "BLOCK BLITZ API is running",
  });
});

app.listen(PORT, () => {
  console.log(`BLOCK BLITZ API running on port ${PORT}`);
});
