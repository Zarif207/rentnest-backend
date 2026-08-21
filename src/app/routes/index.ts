import express from "express";
import { AuthRoutes } from "../modules/auth/auth.route";
import { UserRoutes } from "../modules/user/user.route";
import { LandlordPropertyRoutes } from "../modules/property/property.route";
import { PropertyRoutes } from "../modules/property/property.route";
import { RentalRoutes } from "../modules/rental/rental.route";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/admin/users",
    route: UserRoutes,
  },
  {
    path: "/properties",
    route: PropertyRoutes,
  },
  {
    path: "/landlord/properties",
    route: LandlordPropertyRoutes,
  },
  {
    path: "/rentals",
    route: RentalRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
