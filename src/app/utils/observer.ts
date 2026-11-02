import { Request } from "express";

export const OBSERVER_ROLE = "OBSERVER";

// Methods an observer may use; everything else is a write.
export const READ_METHODS = ["GET", "HEAD", "OPTIONS"];

export const isObserver = (req: Request) => req.user?.role === OBSERVER_ROLE;

/**
 * The owner a landlord read is scoped to: the signed-in landlord, or nobody
 * (every landlord's records) for an observer.
 */
export const ownerScope = (req: Request) =>
  isObserver(req) ? undefined : (req.user.userId as string);
