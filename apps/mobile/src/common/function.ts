const distanceText = (distance: number) => {
  return distance < 1000
    ? `${Math.round(distance)} m`
    : `${(distance / 1000).toFixed(1)} km`;
};

export { distanceText };
