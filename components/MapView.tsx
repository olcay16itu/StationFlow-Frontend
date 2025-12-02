import React, { useEffect, useRef } from 'react';
import { Station, UserLocation, Location } from '../types';
import L from 'leaflet';

// Fix for default marker icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;

interface MapViewProps {
    stations: Station[];
    userLocation: UserLocation | null;
    selectedStation: Station | null;
    routeDestination?: Station | null;
    onStationSelect: (station: Station) => void;
    showRoute: boolean;
    isPickingLocation?: boolean;
    onLocationPicked?: (loc: Location) => void;
    onCreateRoute?: () => void;
    onRemoveRoute?: () => void;
    onReportStatus?: (stationId: string) => void;
}

const MapView: React.FC<MapViewProps> = ({
    stations,
    userLocation,
    selectedStation,
    routeDestination,
    onStationSelect,
    showRoute,
    isPickingLocation = false,
    onLocationPicked,
    onCreateRoute,
    onRemoveRoute,
    onReportStatus
}) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markersRef = useRef<{ [key: string]: L.Marker }>({});
    const routeLayerRef = useRef<L.Polyline | null>(null);
    const userMarkerRef = useRef<L.Marker | null>(null);

    // Use refs to store the latest version of callbacks to avoid stale closures
    const onCreateRouteRef = useRef(onCreateRoute);
    const onRemoveRouteRef = useRef(onRemoveRoute);
    const onReportStatusRef = useRef(onReportStatus);

    useEffect(() => {
        onCreateRouteRef.current = onCreateRoute;
        onRemoveRouteRef.current = onRemoveRoute;
        onReportStatusRef.current = onReportStatus;
    }, [onCreateRoute, onRemoveRoute, onReportStatus]);

    // Helper to reliably bind popup buttons
    const bindPopupButtons = (container: HTMLElement) => {
        // Bind Route Button
        const routeBtn = container.querySelector('.route-btn');
        if (routeBtn) {
            // Replace the button with a clone to strip old listeners and add a fresh one
            // This prevents duplicate listeners and ensures we attach to the current DOM
            const newBtn = routeBtn.cloneNode(true);
            routeBtn.parentNode?.replaceChild(newBtn, routeBtn);

            newBtn.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation(); // Stop propagation to map click

                // Check the action data attribute to decide which handler to call
                const targetBtn = ev.currentTarget as HTMLElement;
                const action = targetBtn.getAttribute('data-action');

                if (action === 'remove' && onRemoveRouteRef.current) {
                    onRemoveRouteRef.current();
                } else if (onCreateRouteRef.current) {
                    onCreateRouteRef.current();
                }
            });
        }

        // Bind Report Button
        const reportBtn = container.querySelector('.report-btn');
        if (reportBtn) {
            const newReportBtn = reportBtn.cloneNode(true);
            reportBtn.parentNode?.replaceChild(newReportBtn, reportBtn);

            newReportBtn.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                const targetBtn = ev.currentTarget as HTMLElement;
                const stationId = targetBtn.getAttribute('data-station-id');
                if (stationId && onReportStatusRef.current) {
                    onReportStatusRef.current(stationId);
                }
            });
        }
    };

    // Initialize Map
    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        const initialLat = userLocation ? userLocation.lat : 41.0082;
        const initialLng = userLocation ? userLocation.lng : 28.9784;

        const map = L.map(mapContainerRef.current, {
            zoomControl: false // Disable default to move it manually
        }).setView([initialLat, initialLng], 13);

        L.control.zoom({ position: 'topright' }).addTo(map);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        // Global listener for ANY popup open event on the map
        map.on('popupopen', (e) => {
            const contentNode = e.popup.getElement();
            if (contentNode) {
                bindPopupButtons(contentNode);
            }
        });

        mapInstanceRef.current = map;

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    // Handle "Picking Location" Mode
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (isPickingLocation) {
            if (mapContainerRef.current) {
                mapContainerRef.current.style.cursor = 'crosshair';
            }

            const handler = (e: L.LeafletMouseEvent) => {
                if (onLocationPicked) {
                    onLocationPicked({ lat: e.latlng.lat, lng: e.latlng.lng });
                }
            };

            map.on('click', handler);

            return () => {
                map.off('click', handler);
                if (mapContainerRef.current) {
                    mapContainerRef.current.style.cursor = '';
                }
            };
        }
    }, [isPickingLocation, onLocationPicked]);

    // Handle User Location Update
    useEffect(() => {
        if (!mapInstanceRef.current || !userLocation) return;

        if (!userMarkerRef.current) {
            const userIcon = L.divIcon({
                className: 'bg-transparent',
                html: `<div class="relative flex h-6 w-6">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-6 w-6 bg-blue-600 border-2 border-white shadow-md"></span>
                    </div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
                .addTo(mapInstanceRef.current)
                .bindPopup("Konumunuz");

            mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 14);
        } else {
            userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
        }
    }, [userLocation]);

    // Handle Stations (Markers)
    useEffect(() => {
        if (!mapInstanceRef.current) return;

        const currentIds = new Set(stations.map(s => s.id));
        // Remove old markers
        Object.keys(markersRef.current).forEach(id => {
            if (!currentIds.has(id)) {
                markersRef.current[id].remove();
                delete markersRef.current[id];
            }
        });

        stations.forEach(station => {
            let colorClass = '';
            let iconChar = '';

            switch (station.type.toLowerCase()) {
                case 'bus': colorClass = 'bg-red-500'; iconChar = '🚌'; break;
                case 'metro': colorClass = 'bg-indigo-600'; iconChar = '🚇'; break;
                case 'bike': colorClass = 'bg-green-500'; iconChar = '🚲'; break;
                case 'scooter': colorClass = 'bg-yellow-500'; iconChar = '🛴'; break;
            }

            if (station.status === 'maintenance') {
                colorClass = 'bg-gray-400';
                iconChar = '🔧';
            }

            const isSelected = selectedStation?.id === station.id;
            const size = isSelected ? 'w-10 h-10 text-xl' : 'w-8 h-8 text-sm';
            const zIndex = isSelected ? 1000 : 1;

            const customIcon = L.divIcon({
                className: 'bg-transparent',
                html: `<div class="${colorClass} ${size} rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-all transform hover:scale-110 text-white font-bold cursor-pointer">
                    ${iconChar}
                   </div>`,
                iconSize: isSelected ? [40, 40] : [32, 32],
                iconAnchor: isSelected ? [20, 20] : [16, 16]
            });

            // Determine button state based on route
            const isRouteActive = showRoute && routeDestination?.id === station.id;
            const btnText = isRouteActive ? 'Rotayı Bitir' : 'Rota Oluştur';
            const btnColor = isRouteActive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700';
            const action = isRouteActive ? 'remove' : 'create';

            // Popup Content Template
            const popupContent = `
            <div class="p-1 min-w-[200px] font-sans">
                <div class="font-bold text-base mb-1 text-slate-800">${station.name}</div>
                <div class="flex items-center gap-2 mb-2 text-xs text-slate-600">
                    <span class="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase font-semibold">${station.type}</span>
                    <span>${station.capacity} Kapasite</span>
                </div>
                <div class="mb-3">
                    <div class="text-xs text-slate-500">Durum</div>
                    <div class="font-bold ${station.available > 0 ? 'text-green-600' : 'text-red-600'}">
                        ${station.status === 'active' ? 'Aktif' : station.status === 'maintenance' ? 'Bakımda' : station.status === 'full' ? 'Dolu' : 'Boş'}
                         (${station.available} ${['bike', 'scooter'].includes(station.type) ? 'Araç' : 'Boş'})
                    </div>
                </div>
                <div class="flex gap-2">
                    <button type="button" data-action="${action}" class="route-btn flex-1 ${btnColor} text-white text-sm font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                        ${btnText}
                    </button>
                    <button type="button" data-action="report" data-station-id="${station.id}" class="report-btn flex-1 bg-slate-500 hover:bg-slate-600 text-white text-sm font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                        Durum Bildir
                    </button>
                </div>
            </div>
        `;

            if (markersRef.current[station.id]) {
                const marker = markersRef.current[station.id];
                marker.setIcon(customIcon);
                marker.setZIndexOffset(zIndex);

                // Check if content string actually changed before updating to prevent DOM thrashing
                const oldContent = marker.getPopup()?.getContent();
                if (oldContent !== popupContent) {
                    marker.setPopupContent(popupContent);

                    // CRITICAL: If popup is currently open and we updated content, 
                    // we MUST re-bind the button event immediately.
                    if (marker.isPopupOpen()) {
                        // Use setTimeout to allow Leaflet to render the new HTML content
                        setTimeout(() => {
                            const contentNode = marker.getPopup()?.getElement();
                            if (contentNode) bindPopupButtons(contentNode);
                        }, 0);
                    }
                }
            } else {
                const marker = L.marker([station.location.lat, station.location.lng], {
                    icon: customIcon,
                    zIndexOffset: zIndex
                })
                    .bindPopup(popupContent, { offset: [0, -10] })
                    .addTo(mapInstanceRef.current!)
                    .on('click', () => {
                        if (!isPickingLocation) {
                            onStationSelect(station);
                        }
                    });

                markersRef.current[station.id] = marker;
            }

            // Programmatically open popup if selected
            if (isSelected && mapInstanceRef.current && !isPickingLocation) {
                const marker = markersRef.current[station.id];
                if (!marker.isPopupOpen()) {
                    marker.openPopup();
                }
            }
        });
    }, [stations, selectedStation, onStationSelect, isPickingLocation, routeDestination, showRoute]);

    // Handle Route Drawing with OSRM
    useEffect(() => {
        if (!mapInstanceRef.current) return;

        if (routeLayerRef.current) {
            routeLayerRef.current.remove();
            routeLayerRef.current = null;
        }

        const fetchRoute = async () => {
            if (showRoute && userLocation && routeDestination && !isPickingLocation) {
                try {
                    const url = `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${routeDestination.location.lng},${routeDestination.location.lat}?overview=full&geometries=geojson`;

                    const response = await fetch(url);
                    const data = await response.json();

                    if (data.routes && data.routes.length > 0) {
                        const geometry = data.routes[0].geometry;
                        const latLngs = geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);

                        routeLayerRef.current = L.polyline(latLngs, {
                            color: '#3b82f6',
                            weight: 5,
                            opacity: 0.8,
                            lineCap: 'round',
                            lineJoin: 'round'
                        }).addTo(mapInstanceRef.current!);

                        mapInstanceRef.current!.fitBounds(L.latLngBounds(latLngs), { padding: [50, 50] });
                    }
                } catch (error) {
                    console.error("Routing error:", error);
                    // Fallback line
                    const latlngs: [number, number][] = [
                        [userLocation.lat, userLocation.lng],
                        [routeDestination.location.lat, routeDestination.location.lng]
                    ];
                    routeLayerRef.current = L.polyline(latlngs, {
                        color: '#ef4444',
                        weight: 4,
                        opacity: 0.7,
                        dashArray: '10, 10'
                    }).addTo(mapInstanceRef.current!);
                }
            }
        };

        fetchRoute();

    }, [showRoute, userLocation, routeDestination, isPickingLocation]);

    // Center map on selection
    useEffect(() => {
        if (selectedStation && mapInstanceRef.current && !showRoute && !isPickingLocation) {
            // Only pan if not already very close to avoid jitter
            const center = mapInstanceRef.current.getCenter();
            const dist = center.distanceTo([selectedStation.location.lat, selectedStation.location.lng]);
            if (dist > 50) { // 50 meters tolerance
                mapInstanceRef.current.panTo([selectedStation.location.lat, selectedStation.location.lng]);
            }
        }
    }, [selectedStation, showRoute, isPickingLocation]);

    return <div ref={mapContainerRef} className="h-full w-full bg-slate-200" />;
};

export default MapView;