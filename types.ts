
export type TransportType = 'bus' | 'metro' | 'bike' | 'scooter' | 'minibus' | 'taxi' | 'dolmus';

export interface Location {
  lat: number;
  lng: number;
}

export interface Station {
  id: string;
  name: string;
  type: TransportType;
  location: Location;
  capacity: number;
  available: number; // For vehicles (bike/scooter) or occupancy % (bus/metro) inverse
  status: 'active' | 'maintenance' | 'empty' | 'full';
  lastUpdate: string;
  isCustom?: boolean; // To identify user-added stations
  ownerId?: string; // ID of the user who created this station
}

export interface UserLocation extends Location {
  accuracy?: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  token?: string;
}

export interface UpdateRequest {
  id: string;
  stationId: string;
  stationName: string;
  userId: string;
  username: string;
  requestedAvailable: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}
