export const BOOKING_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;

export const RENTAL_MESSAGES = {
  CREATED: "Rental request submitted successfully",
  RETRIEVED: "Rental request retrieved successfully",
  RETRIEVED_ALL: "Rental requests retrieved successfully",
  UPDATED: "Rental request updated successfully",
  NOT_FOUND: "Rental request not found",
  ALREADY_PROCESSED: "Rental request has already been processed",
} as const;