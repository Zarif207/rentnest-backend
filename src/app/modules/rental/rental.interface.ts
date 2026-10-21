import { BOOKING_STATUS } from "./rental.constant.js";

export type TBookingStatus = keyof typeof BOOKING_STATUS;

export interface ICreateRentalRequest {
  propertyId: string;
  moveInDate: string;
  leaseMonths: number;
}

export interface IUpdateRentalRequestStatus {
  bookingStatus: "APPROVED" | "REJECTED";
}