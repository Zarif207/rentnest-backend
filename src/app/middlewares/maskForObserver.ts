import { NextFunction, Request, Response } from "express";
import { isObserver } from "../utils/observer.js";

// Keys whose values are personal data or payment identifiers.
const STRIPE_KEYS = new Set([
  "sessionId",
  "transactionId",
  "paymentIntent",
  "paymentIntentId",
  "stripeSessionId",
]);
const STRIPE_ID = /^(cs|pi)_/;

const keep = (value: string, start: number, end: number) =>
  value.length <= start + end
    ? "*".repeat(value.length)
    : `${value.slice(0, start)}${"*".repeat(Math.max(3, value.length - start - end))}${value.slice(value.length - end)}`;

/** "rahim@gmail.com" → "ra***@gmail.com" */
export const maskEmail = (email: string) => {
  const at = email.indexOf("@");
  if (at < 1) return keep(email, 1, 0);
  return `${email.slice(0, Math.min(2, at))}***${email.slice(at)}`;
};

/** "+8801712345123" → "+880*****123" */
export const maskPhone = (phone: string) =>
  keep(phone, 4, 3).replace(/\*+/, "*****");

const maskId = (id: string) => keep(id, 3, 4);

const mask = (value: unknown, key?: string): unknown => {
  if (Array.isArray(value)) return value.map((item) => mask(item));
  if (value instanceof Date) return value;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, child]) => [
        childKey,
        mask(child, childKey),
      ]),
    );
  }
  if (typeof value !== "string") return value;
  if (key === "email") return maskEmail(value);
  if (key === "phone") return maskPhone(value);
  if ((key && STRIPE_KEYS.has(key)) || STRIPE_ID.test(value))
    return maskId(value);
  return value;
};

/**
 * One response transformer for observers: every JSON body sent to an
 * OBSERVER has emails, phone numbers and Stripe identifiers masked. Their
 * own profile (/api/auth/me) is left as is.
 */
const maskForObserver = (req: Request, res: Response, next: NextFunction) => {
  const json = res.json.bind(res);
  res.json = (body: unknown) => {
    const ownProfile = req.originalUrl.split("?")[0] === "/api/auth/me";
    // JSON round-trip first, so Decimal and Date values serialize as usual.
    return json(
      isObserver(req) && !ownProfile
        ? mask(JSON.parse(JSON.stringify(body)))
        : body,
    );
  };
  next();
};

export default maskForObserver;
