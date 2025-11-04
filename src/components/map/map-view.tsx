'use client';

import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import type { Household, FollowUpVisit } from '@/lib/types';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

type HouseholdWithVisit = Household & { visitStatus?: FollowUpVisit['status'] };

interface MapViewProps {
  households: HouseholdWithVisit[];
  apiKey: string;
}

export function MapView({ households, apiKey }: MapViewProps) {
  const [selectedHousehold, setSelectedHousehold] = useState<HouseholdWithVisit | null>(null);

  const getPinColor = (status?: FollowUpVisit['status']) => {
    switch (status) {
      case 'Overdue':
        return '#ef4444'; // red-500
      case 'Pending':
        return '#facc15'; // yellow-400
      case 'Completed':
      default:
        return '#3b82f6'; // blue-500
    }
  };

  return (
    <APIProvider apiKey={apiKey}>
        <div className="relative h-full w-full">
            <Map
                style={{ width: '100%', height: '100%' }}
                defaultCenter={{ lat: 28.7041, lng: 77.1025 }}
                defaultZoom={12}
                gestureHandling={'greedy'}
                disableDefaultUI={true}
                mapId={'f5d968a3556f272b'}
            >
                {households.map((household) => (
                    <AdvancedMarker
                        key={household.id}
                        position={{ lat: household.latitude, lng: household.longitude }}
                        onClick={() => setSelectedHousehold(household)}
                    >
                         <Pin 
                            background={getPinColor(household.visitStatus)} 
                            borderColor={'#fff'} 
                            glyphColor={'#fff'} 
                        />
                    </AdvancedMarker>
                ))}

                {selectedHousehold && (
                    <InfoWindow
                        position={{ lat: selectedHousehold.latitude, lng: selectedHousehold.longitude }}
                        onCloseClick={() => setSelectedHousehold(null)}
                    >
                        <div className="p-2 w-64">
                            <h3 className="font-bold text-base font-headline">{selectedHousehold.familyName}</h3>
                            <p className="text-sm text-muted-foreground">{selectedHousehold.fullAddress}</p>
                            <div className="mt-2">
                                <span className="font-semibold">Status: </span> 
                                <Badge variant={selectedHousehold.visitStatus === "Overdue" ? "destructive" : "secondary"}>{selectedHousehold.visitStatus}</Badge>
                            </div>
                        </div>
                    </InfoWindow>
                )}
            </Map>
            <div className="absolute bottom-4 left-4">
                <Card className="shadow-lg">
                    <CardHeader><CardTitle className="text-sm">Legend</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{backgroundColor: getPinColor('Overdue')}}></div> Overdue</div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{backgroundColor: getPinColor('Pending')}}></div> Upcoming</div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{backgroundColor: getPinColor('Completed')}}></div> Up-to-date</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </APIProvider>
  );
}
