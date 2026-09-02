export interface ICreatePayment {
  bookingId: string;
  transactionId: string;
  amount: number;
  paymentMethod: "STRIPE" | "CASH";
}