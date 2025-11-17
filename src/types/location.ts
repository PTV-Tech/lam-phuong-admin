export interface Location {
  id: string;
  name: string;
  slug: string;
}

export interface CreateLocationRequest {
  name: string;
}

export interface CreateLocationResponse {
  data: Location;
  message: string;
  success: true;
}

export interface LocationsResponse {
  data: Location[];
  message: string;
  success: true;
}

export interface DeleteLocationResponse {
  data: string;
  message: string;
  success: true;
}

export interface LocationError {
  error: {
    code: string;
    details?: Record<string, unknown>;
    message: string;
  };
  message: string;
  success: false;
}

