import { CategoryRoutes } from "../modules/category/category.route.js";
import express from "express";
import { AuthRoutes } from "../modules/auth/auth.route.js";
import { UserRoutes } from "../modules/user/user.route.js";
import {
  LandlordPropertyRoutes,
  PropertyRoutes,
  AdminPropertyRoutes,
} from "../modules/property/property.route.js";
import {
  RentalRoutes,
  AdminRentalRoutes,
} from "../modules/rental/rental.route.js";
import { LandlordRoutes } from "../modules/landlord/landlord.route.js";
import { PaymentRoutes } from "../modules/payment/payment.route.js";
import { ReviewRoutes } from "../modules/review/review.route.js";

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
    path: "/admin/properties",
    route: AdminPropertyRoutes,
  },
  {
    path: "/admin/rentals",
    route: AdminRentalRoutes,
  },
  {
    path: "/categories",
    route: CategoryRoutes,
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
