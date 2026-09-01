export interface ICreateRentalRequest {
  propertyId: string;
  moveInDate: string;
  leaseMonths: number;
}

export interface IUpdateRentalRequestStatus {
  bookingStatus: "APPROVED" | "REJECTED";
}