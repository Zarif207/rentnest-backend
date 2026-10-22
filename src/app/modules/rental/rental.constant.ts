export const BOOKING_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
} as const;

export const BOOKING_STATUSES = Object.values(BOOKING_STATUS) as [
  keyof typeof BOOKING_STATUS,
  ...(keyof typeof BOOKING_STATUS)[],
];

export const rentalSortableFields = [
  "createdAt",
  "moveInDate",
  "totalRent",
] as const;
