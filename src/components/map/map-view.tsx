
'use client';

import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import type { Household, FollowUpVisit } from '@/lib/types';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { isPast } from 'date-fns';

type LatLng = {
    lat: number;
    lng: number;
};

type HouseholdWithVisit = Household & { visitStatus?: FollowUpVisit['status'] };

interface MapViewProps {
    households: HouseholdWithVisit[];
    apiKey: string;
    center: LatLng | null;
}

const UserLocationIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="#4285F4" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="12" cy="12" r="5" fill="#FFFFFF" />
    </svg>
);


export function MapView({ households, apiKey, center }: MapViewProps) {
    const [selectedHousehold, setSelectedHousehold] = useState<HouseholdWithVisit | null>(null);

    const getPinColor = (household: HouseholdWithVisit) => {
        // Prioritize completed status
        if (household.visitStatus === 'Completed') {
            return '#22c55e'; // green-500
        }

        const isOverdue = isPast(new Date(household.nextFollowupDue));
        if (isOverdue) {
            return '#ef4444'; // red-500
        }
        return '#facc15'; // yellow-400
    };

    const getStatusText = (household: HouseholdWithVisit) => {
        if (household.visitStatus === 'Completed') return 'Up-to-date';

        const isOverdue = isPast(new Date(household.nextFollowupDue));
        if (isOverdue) return 'Overdue';
        return 'Upcoming';
    }

    return (
        <APIProvider apiKey={apiKey}>
            <div className="relative h-full w-full">
                <Map
                    key={center ? `${center.lat}-${center.lng}` : 'default'} // Re-render map when center changes
                    style={{ width: '100%', height: '100%' }}
                    defaultCenter={center || { lat: 28.7041, lng: 77.1025 }}
                    defaultZoom={13}
                    gestureHandling={'greedy'}
                    disableDefaultUI={true}
                    mapId={'f5d968a3556f272b'}
                >
                    {households
                        .filter(h => h.latitude != null && h.longitude != null)
                        .map((household) => (
                            <AdvancedMarker
                                key={household.id}
                                position={{ lat: household.latitude!, lng: household.longitude! }}
                                onClick={() => setSelectedHousehold(household)}
                            >
                                <Pin
                                    background={getPinColor(household)}
                                    borderColor={'#fff'}
                                    glyphColor={'#fff'}
                                />
                            </AdvancedMarker>
                        ))}

                    {center && (
                        <AdvancedMarker position={center} title="Your Location">
                            <UserLocationIcon />
                        </AdvancedMarker>
                    )}

                    {selectedHousehold && selectedHousehold.latitude != null && selectedHousehold.longitude != null && (
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
                            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#ef4444' }}></div> Overdue</div>
                            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#facc15' }}></div> Upcoming</div>
                            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#22c55e' }}></div> Up-to-date</div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </APIProvider>
    );
}
