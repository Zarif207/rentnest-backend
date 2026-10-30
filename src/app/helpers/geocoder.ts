import config from "../../config/index.js";

type TLocation = {
  address: string;
  city: string;
  division: string;
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const TIMEOUT_MS = 5000;

// Nominatim's usage policy asks for an identifying User-Agent with a contact.
const userAgent = () =>
  config.geocoder_email
    ? `RentNest/1.0 (${config.geocoder_email})`
    : "RentNest/1.0 (https://rentnest-backend-one.vercel.app)";

/**
 * Looks up coordinates for a US address with OpenStreetMap Nominatim.
 * Never throws: returns null on no match, a network error or a timeout, so
 * saving a property never fails because of geocoding.
 */
const geocodeAddress = async ({
  address,
  city,
  division,
}: TLocation): Promise<{ latitude: number; longitude: number } | null> => {
  try {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "us");
    url.searchParams.set("q", `${address}, ${city}, ${division}`);

    const response = await fetch(url, {
      headers: { "User-Agent": userAgent(), Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) return null;

    const results = (await response.json()) as { lat?: string; lon?: string }[];
    const latitude = Number(results[0]?.lat);
    const longitude = Number(results[0]?.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return { latitude, longitude };
  } catch (error) {
    console.error(
      "Geocoding failed",
      `${address}, ${city}, ${division}`,
      error,
    );
    return null;
  }
};

export const geocoder = {
  geocodeAddress,
};
