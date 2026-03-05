import type { ListingResult } from "../zillow/types.js";
import type { UpsertListingArgs } from "./generated/query_sql.js";

/** Convert a Zillow ListingResult to a source-agnostic UpsertListingArgs. */
export function fromZillow(r: ListingResult): UpsertListingArgs {
  return {
    source: "zillow",
    sourceId: r.zpid,
    address: r.address,
    city: r.city,
    state: r.state,
    zipcode: r.zipcode,
    price: r.price,
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    livingArea: r.livingArea,
    lotAreaValue: r.lotAreaValue,
    yearBuilt: r.yearBuilt,
    homeType: r.homeType,
    homeStatus: r.homeStatus,
    latitude: r.latitude,
    longitude: r.longitude,
    imgSrc: r.imgSrc,
    detailUrl: r.detailUrl,
    sourceData: {
      zestimate: r.zestimate,
      rentZestimate: r.rentZestimate,
      daysOnZillow: r.daysOnZillow,
    },
  };
}
