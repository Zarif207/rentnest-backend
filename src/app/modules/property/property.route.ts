import express from "express";

import { PropertyControllers } from "./property.controller";

const router = express.Router();

router.get("/", PropertyControllers.getAllProperties);

export const PropertyRoutes = router;
