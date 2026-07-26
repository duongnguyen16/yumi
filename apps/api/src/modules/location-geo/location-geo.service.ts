import { Injectable } from '@nestjs/common';

export const LOCATION_PIN_MAX_DISTANCE_METERS = 200;
export const LOCATION_PIN_MAX_ACCURACY_METERS = 50;

@Injectable()
export class LocationGeoService {
  getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
    const earthRadius = 6371000;
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(earthRadius * c);
  }

  validatePinDistance(input: {
    pinLatitude: number;
    pinLongitude: number;
    deviceLatitude: number;
    deviceLongitude: number;
    accuracyMeters?: number;
  }) {
    const distanceMeters = this.getDistanceMeters(
      input.deviceLatitude,
      input.deviceLongitude,
      input.pinLatitude,
      input.pinLongitude,
    );

    return {
      success: true,
      distanceMeters,
      maxDistanceMeters: LOCATION_PIN_MAX_DISTANCE_METERS,
      withinRange: distanceMeters <= LOCATION_PIN_MAX_DISTANCE_METERS,
      requiresManualPin:
        (input.accuracyMeters ?? 0) > LOCATION_PIN_MAX_ACCURACY_METERS,
    };
  }

  private toRadians(value: number) {
    return (value * Math.PI) / 180;
  }
}
