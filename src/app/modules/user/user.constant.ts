export const userSearchableFields = ["name", "email"] as const;

export const userFilterableFields = [
  "searchTerm",
  "role",
  "userStatus",
  "landlordStatus",
];

export const userSortableFields = ["createdAt", "name", "email"] as const;
