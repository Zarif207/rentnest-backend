import express from "express";
import { AuthRoutes } from "../modules/auth/auth.route";
import { UserRoutes } from "../modules/user/user.route";
import {
  LandlordPropertyRoutes,
  PropertyRoutes,
  AdminPropertyRoutes,
} from "../modules/property/property.route";
import { RentalRoutes } from "../modules/rental/rental.route";
import { LandlordRoutes } from "../modules/landlord/landlord.route";
import { PaymentRoutes } from "../modules/payment/payment.route";
import { ReviewRoutes } from "../modules/review/review.route";

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
  { path: "/admin/properties", route: AdminPropertyRoutes },
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
  {
    path: "/landlord",
    route: LandlordRoutes,
  },
  {
    path: "/payments",
    route: PaymentRoutes,
  },
  {
    path: "/reviews",
    route: ReviewRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
