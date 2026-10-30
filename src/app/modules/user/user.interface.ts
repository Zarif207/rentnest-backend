export type TUpdateMyProfile = {
  name?: string;
  email?: string;
  phone?: string;
};

export type TUserFilters = {
  searchTerm?: string;
  role?: string;
  userStatus?: string;
  landlordStatus?: string;
};

export type TUpdateLandlordStatus = {
  landlordStatus: "APPROVED" | "REJECTED";
};
