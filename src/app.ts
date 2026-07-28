import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./app/routes";

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use("/api", router);
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "RentNest Backend API is running 🚀",
  });
});

export default app;