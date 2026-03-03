export interface SearchParams {
  location: string;
  home_status?: "FOR_SALE" | "FOR_RENT" | "RECENTLY_SOLD";
  listing_type?: "BY_AGENT" | "BY_OWNER" | "NEW_CONSTRUCTION";
  sort?: "DEFAULT" | "NEWEST" | "PRICE_LOW" | "PRICE_HIGH";
  page?: number;
}

export interface SearchByCoordinatesParams {
  latitude: number;
  longitude: number;
  radius?: number;
  home_status?: "FOR_SALE" | "FOR_RENT" | "RECENTLY_SOLD";
  listing_type?: "BY_AGENT" | "BY_OWNER" | "NEW_CONSTRUCTION";
  sort?: "DEFAULT" | "NEWEST" | "PRICE_LOW" | "PRICE_HIGH";
  page?: number;
}

export interface ListingResult {
  zpid: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  livingArea: number | null;
  lotAreaValue: number | null;
  yearBuilt: number | null;
  homeType: string | null;
  homeStatus: string | null;
  zestimate: number | null;
  rentZestimate: number | null;
  daysOnZillow: number | null;
  imgSrc: string | null;
  detailUrl: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface PropertyDetail extends ListingResult {
  description: string | null;
  priceHistory: PriceEvent[];
  taxHistory: TaxRecord[];
  photos: string[];
  mlsId: string | null;
  brokerageName: string | null;
  agentName: string | null;
  datePosted: string | null;
  dateSold: string | null;
  features: Record<string, unknown>;
}

export interface PriceEvent {
  date: string;
  price: number | null;
  event: string;
}

export interface TaxRecord {
  year: number;
  taxPaid: number | null;
  value: number | null;
}

export interface Zestimate {
  zpid: string;
  zestimate: number | null;
  rentZestimate: number | null;
}

/** Wrapper for all API responses */
export interface ApiResponse<T> {
  status: "OK" | "ERROR";
  request_id: string;
  data?: T;
  error?: { message: string; code: number };
}
