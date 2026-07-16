import type { AccessSide } from "@/service/requestAccessService";

export type RequestAccessTab = { label: string; side: AccessSide };

export const requestAccessTabs: readonly RequestAccessTab[] = [
  { label: "Tôi nhận", side: "owner" },
  { label: "Tôi gửi", side: "requester" },
];

export function getRequestAccessTab(index: number): RequestAccessTab {
  return requestAccessTabs[index] ?? requestAccessTabs[0];
}
