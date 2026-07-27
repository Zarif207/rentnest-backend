export default {
  port: process.env.PORT || 4000,
  database_url: process.env.DATABASE_URL as string,
  jwt_access_secret: process.env.JWT_ACCESS_SECRET as string,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET as string,
  stripe_secret: process.env.STRIPE_SECRET as string,
};