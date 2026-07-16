import type { EditSuggestionChange, EditSuggestionFlag } from "@/service/editSuggestionService";

export type EditField = "name" | "address" | "openingHours" | "description" | "phone" | "flag" | "category";

const ownerFields: EditField[] = ["name", "address", "openingHours", "description", "phone", "category"];
const publicFields: EditField[] = ["address", "openingHours", "phone", "flag"];

export function getAllowedEditFields(isOwner: boolean) {
  return isOwner ? ownerFields : publicFields;
}

export function buildSuggestionChanges({ selectedFields, openingHours, phone, coordinates, flag }: { selectedFields: EditField[]; openingHours: string; phone: string; coordinates?: [number, number] | null; flag: EditSuggestionFlag }) {
  const changes: EditSuggestionChange[] = [];
  if (selectedFields.includes("openingHours") && openingHours.trim()) changes.push({ fieldName: "openingHours", textValue: openingHours.trim() });
  if (selectedFields.includes("phone") && phone.trim()) changes.push({ fieldName: "phone", textValue: phone.trim() });
  if (selectedFields.includes("address") && coordinates) changes.push({ fieldName: "geo", geoValue: { latitude: coordinates[1], longitude: coordinates[0] } });
  if (selectedFields.includes("flag")) changes.push({ fieldName: "flag", flagValue: flag });
  return changes;
}
