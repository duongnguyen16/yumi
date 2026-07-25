type BackRouter = {
  back: () => void;
};

type ReplaceRouter = {
  replace: (href: "/(tabs)/home") => void;
};

export function returnAfterSuccess(router: BackRouter) {
  router.back();
}

export function returnContributionToHome(router: ReplaceRouter) {
  router.replace("/(tabs)/home");
}
