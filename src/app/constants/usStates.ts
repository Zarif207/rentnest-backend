// The 50 US states plus DC: postal code → full name. `division` on a
// property always stores the full name.
export const US_STATES = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
} as const;

const NAME_BY_KEY = new Map<string, string>(
  Object.entries(US_STATES).flatMap(([code, name]) => [
    [code.toLowerCase(), name],
    [name.toLowerCase(), name],
  ]),
);

/**
 * "MI", "mi", "Michigan" or "michigan" → "Michigan". Also accepts "Washington
 * DC" / "Washington, D.C." for DC. Returns null for anything unknown.
 */
export const normalizeUsState = (value: string): string | null => {
  const key = value
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");

  if (key === "washington dc" || key === "washington, dc") {
    return US_STATES.DC;
  }

  return NAME_BY_KEY.get(key) ?? null;
};
