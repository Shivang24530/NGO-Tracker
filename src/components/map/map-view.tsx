
'use client';

import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import type { Household, FollowUpVisit } from '@/lib/types';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { isPast } from 'date-fns';

type HouseholdWithVisit = Household & { visitStatus?: FollowUpVisit['status'] };

interface MapViewProps {
  households: HouseholdWithVisit[];
  apiKey: string;
}

export function MapView({ households, apiKey }: MapViewProps) {
  const [selectedHousehold, setSelectedHousehold] = useState<HouseholdWithVisit | null>(null);

  const getPinColor = (household: HouseholdWithVisit) => {
    // A more accurate status based on next follow-up date
    const isOverdue = isPast(new Date(household.nextFollowupDue));

    if (household.visitStatus === 'Completed' && !isOverdue) {
       return '#22c55e'; // green-500
    }
    if (isOverdue) {
      return '#ef4444'; // red-500
    }
    return '#facc15'; // yellow-400
  };

  const getStatusText = (household: HouseholdWithVisit) => {
    const isOverdue = isPast(new Date(household.nextFollowupDue));
    if (isOverdue) return 'Overdue';
    if (household.visitStatus === 'Completed') return 'Up-to-date';
    return 'Upcoming';
  }

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
                            background={getPinColor(household)}
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
                                <span className="font-semibold">Visit Status: </span> 
                                <Badge variant={getStatusText(selectedHousehold) === "Overdue" ? "destructive" : "secondary"}>
                                  {getStatusText(selectedHousehold)}
                                </Badge>
                            </div>
                        </div>
                    </InfoWindow>
                )}
            </Map>
            <div className="absolute bottom-4 left-4">
                <Card className="shadow-lg">
                    <CardHeader><CardTitle className="text-sm">Legend</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{backgroundColor: '#ef4444'}}></div> Overdue</div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{backgroundColor: '#facc15'}}></div> Upcoming</div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{backgroundColor: '#22c55e'}}></div> Up-to-date</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </APIProvider>
  );
}
