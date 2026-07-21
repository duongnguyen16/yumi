type BackRouter = {
  back: () => void;
};

export function returnAfterSuccess(router: BackRouter) {
  router.back();
}
