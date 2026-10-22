export const userSearchableFields = ["name", "email"] as const;

export const userFilterableFields = ["searchTerm", "role", "userStatus"];

export const userSortableFields = ["createdAt", "name", "email"] as const;
