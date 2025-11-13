
'use client';

import { useState } from 'react';
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

  const handleDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      onLocationChange(e.latLng.lat(), e.latLng.lng());
    }
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      onLocationChange(e.latLng.lat(), e.latLng.lng());
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
        <AdvancedMarker
          position={currentLocation}
          draggable={true}
          onDragEnd={handleDragEnd}
        />
      </Map>
    </APIProvider>
  );
}
