import Stripe from "stripe";
import config from "./index.js";
const stripe = new Stripe(config.stripe_secret);
export default stripe;