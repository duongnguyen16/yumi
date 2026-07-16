import { buildSuggestionChanges, getAllowedEditFields } from "./edit-location-model";

describe("edit location form model", () => {
  it("limits editable fields by ownership", () => {
    expect(getAllowedEditFields(true)).toEqual(["name", "address", "openingHours", "description", "phone", "category"]);
    expect(getAllowedEditFields(false)).toEqual(["address", "openingHours", "phone", "flag"]);
  });

  it("maps selected public suggestions without leaking owner-only fields", () => {
    expect(buildSuggestionChanges({
      selectedFields: ["openingHours", "phone", "address", "flag"],
      openingHours: "07:00-21:00",
      phone: "0909000111",
      coordinates: [106.7, 10.8],
      flag: "DUPLICATE",
    })).toEqual([
      { fieldName: "openingHours", textValue: "07:00-21:00" },
      { fieldName: "phone", textValue: "0909000111" },
      { fieldName: "geo", geoValue: { latitude: 10.8, longitude: 106.7 } },
      { fieldName: "flag", flagValue: "DUPLICATE" },
    ]);
  });
});
