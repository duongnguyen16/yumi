let exploreLocationAction: (() => void) | undefined;

export function setExploreLocationAction(action: () => void) {
  exploreLocationAction = action;
}

export function clearExploreLocationAction() {
  exploreLocationAction = undefined;
}

export function invokeExploreLocationAction() {
  exploreLocationAction?.();
}
