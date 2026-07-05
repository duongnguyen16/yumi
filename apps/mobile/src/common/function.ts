const distanceText = (distance: number) => {
  return distance < 1000
    ? `${Math.round(distance)} m`
    : `${(distance / 1000).toFixed(1)} km`;
};

const dmsToDecimal = (dms: any, ref?: string) => {
  if (!dms) return null;

  let decimal: number;

  if (Array.isArray(dms)) {
    const [degree, minute, second] = dms;
    decimal = Number(degree) + Number(minute) / 60 + Number(second) / 3600;
  } else {
    decimal = Number(dms);
  }

  if (Number.isNaN(decimal)) return null;

  if (ref === "S" || ref === "W") {
    decimal = -decimal;
  }

  return decimal;
};

const getGpsFromExif = (exif: any) => {
  if (!exif) return null;

  const latitude = dmsToDecimal(exif.GPSLatitude, exif.GPSLatitudeRef);
  const longitude = dmsToDecimal(exif.GPSLongitude, exif.GPSLongitudeRef);

  if (latitude == null || longitude == null) return null;

  return {
    latitude,
    longitude,
  };
};

export { distanceText, getGpsFromExif, dmsToDecimal };
