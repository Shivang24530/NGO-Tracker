
'use client';

import { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';

type LatLng = {
  lat: number;
  lng: number;
};

interface LocationPickerProps {
  apiKey: string;
  initialCenter: LatLng;
  onLocationChange: (lat: number, lng: number) => void;
  currentLocation: LatLng;
}

export function LocationPicker({ apiKey, initialCenter, onLocationChange, currentLocation }: LocationPickerProps) {
  const [markerPosition, setMarkerPosition] = useState(currentLocation);

  useEffect(() => {
    if (currentLocation && currentLocation.lat && currentLocation.lng) {
      setMarkerPosition(currentLocation);
    } else {
      setMarkerPosition(initialCenter);
    }
  }, [currentLocation, initialCenter]);

  const handleDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setMarkerPosition(newPos);
      onLocationChange(newPos.lat, newPos.lng);
    }
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setMarkerPosition(newPos);
      onLocationChange(newPos.lat, newPos.lng);
    }
  };

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={initialCenter}
        defaultZoom={15}
        gestureHandling={'greedy'}
        disableDefaultUI={true}
        mapId={'f5d968a3556f272b'}
        onClick={handleMapClick}
      >
        {markerPosition && markerPosition.lat && markerPosition.lng && (
          <AdvancedMarker
            position={markerPosition}
            draggable={true}
            onDragEnd={handleDragEnd}
          />
        )}
      </Map>
    </APIProvider>
  );
}
