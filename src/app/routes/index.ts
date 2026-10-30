import { CategoryRoutes } from "../modules/category/category.route.js";
import express from "express";
import { AuthRoutes } from "../modules/auth/auth.route.js";
import { ProfileRoutes, UserRoutes } from "../modules/user/user.route.js";
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
import { NotificationRoutes } from "../modules/notification/notification.route.js";
import { FavoriteRoutes } from "../modules/favorite/favorite.route.js";
import {
  AdminSiteSettingRoutes,
  SiteSettingRoutes,
} from "../modules/siteSetting/siteSetting.route.js";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/users",
    route: ProfileRoutes,
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
  {
    path: "/notifications",
    route: NotificationRoutes,
  },
  {
    path: "/favorites",
    route: FavoriteRoutes,
  },
  {
    path: "/site-settings",
    route: SiteSettingRoutes,
  },
  {
    path: "/admin/site-settings",
    route: AdminSiteSettingRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
