import {
  OFFER_ACTIONS,
  OFFER_FINANCING,
  OFFER_STATUSES,
} from "./offer.constant.js";

export type TOfferStatus = (typeof OFFER_STATUSES)[number];
export type TOfferFinancing = (typeof OFFER_FINANCING)[number];
export type TOfferAction = (typeof OFFER_ACTIONS)[number];

export type TCreateOffer = {
  propertyId: string;
  offerAmount: number;
  financing: TOfferFinancing;
  message?: string;
};

export type TRespondToOffer = {
  action: TOfferAction;
  counterAmount?: number;
};

export type TOfferFilters = {
  status?: TOfferStatus;
};
