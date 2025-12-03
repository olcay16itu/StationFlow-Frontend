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
    onDeselect?: () => void;
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
    onDeselect,
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
    const onDeselectRef = useRef(onDeselect);

    useEffect(() => {
        onCreateRouteRef.current = onCreateRoute;
        onRemoveRouteRef.current = onRemoveRoute;
        onReportStatusRef.current = onReportStatus;
        onDeselectRef.current = onDeselect;
    }, [onCreateRoute, onRemoveRoute, onReportStatus, onDeselect]);

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

    const [visibleStations, setVisibleStations] = React.useState<Station[]>([]);
    const [zoomLevel, setZoomLevel] = React.useState(13);

    // Keep track of stations for event listeners to avoid stale closures
    const stationsRef = useRef(stations);
    useEffect(() => {
        stationsRef.current = stations;
    }, [stations]);

    const isSwitchingPopup = useRef(false);

    // Initialize Map
    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        const initialLat = userLocation ? userLocation.lat : 41.0082;
        const initialLng = userLocation ? userLocation.lng : 28.9784;

        const map = L.map(mapContainerRef.current, {
            zoomControl: false,
            preferCanvas: true // Enable Canvas renderer for better performance
        }).setView([initialLat, initialLng], 13);

        L.control.zoom({ position: 'topright' }).addTo(map);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        // Global listener for ANY popup open event on the map
        map.on('popupopen', (e) => {
            isSwitchingPopup.current = false;
            const contentNode = e.popup.getElement();
            if (contentNode) {
                bindPopupButtons(contentNode);
            }
        });

        // Global listener for popup close to handle deselection
        map.on('popupclose', (e) => {
            // Mark that we are potentially switching popups
            isSwitchingPopup.current = true;

            // Wait a bit to see if a 'popupopen' event fires immediately after
            setTimeout(() => {
                if (isSwitchingPopup.current) {
                    // If still true, it means no new popup opened -> we are truly closing
                    if (onDeselectRef.current) {
                        onDeselectRef.current();
                    }
                    isSwitchingPopup.current = false;
                }
            }, 200);
        });

        // Handle map click for deselection (backup for popup close)
        map.on('click', (e) => {
            // If we are picking a location, don't deselect
            // The picking logic is handled by a separate listener, but we need to be careful
            // Actually, the picking logic adds its own listener.
            // We just need to check if we clicked on a marker? No, map click means background.
            // But we need to make sure we didn't click on a marker (which bubbles to map click?)
            // Leaflet handles this: click on marker stops propagation if configured, or we can check original event.
            // However, simpler check: if popup is open, it will close and trigger popupclose.
            // If no popup is open and we click map, we should deselect.

            // Note: We can't easily access isPickingLocation state here due to closure, 
            // but we can check if the map cursor is crosshair or check a ref if we had one.
            // For now, rely on popupclose for main logic, but this is a fallback.
            // Actually, let's NOT add a conflicting click listener here to avoid race conditions with picking.
            // The popupclose logic should be sufficient if working correctly.
        });

        // Track bounds and zoom
        const updateVisibleStations = () => {
            const bounds = map.getBounds();
            const zoom = map.getZoom();
            setZoomLevel(zoom);

            // Filter stations within bounds
            // Use ref to get latest stations
            const currentStations = stationsRef.current;

            if (currentStations.length > 0) {
                const visible = currentStations.filter(s =>
                    bounds.contains([s.location.lat, s.location.lng])
                );
                setVisibleStations(visible);
            }
        };

        map.on('moveend', updateVisibleStations);
        map.on('zoomend', updateVisibleStations);

        mapInstanceRef.current = map;

        // Initial update
        updateVisibleStations();

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    // Update visible stations when stations prop changes
    useEffect(() => {
        if (mapInstanceRef.current) {
            const bounds = mapInstanceRef.current.getBounds();
            const visible = stations.filter(s =>
                bounds.contains([s.location.lat, s.location.lng])
            );
            setVisibleStations(visible);
        }
    }, [stations]);

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

        const currentIds = new Set(visibleStations.map(s => s.id));
        // Always include selected station even if out of bounds (though map usually centers on it)
        if (selectedStation) currentIds.add(selectedStation.id);
        // Always include route destination to prevent "route to nowhere" when filtering
        if (routeDestination) currentIds.add(routeDestination.id);

        // Remove old markers
        Object.keys(markersRef.current).forEach(id => {
            if (!currentIds.has(id)) {
                markersRef.current[id].remove();
                delete markersRef.current[id];
            }
        });

        // Render visible stations
        let stationsToRender = [...visibleStations];

        // Add selected if missing
        if (selectedStation && !visibleStations.some(s => s.id === selectedStation.id)) {
            stationsToRender.push(selectedStation);
        }

        // Add route destination if missing and distinct
        if (routeDestination &&
            !visibleStations.some(s => s.id === routeDestination.id) &&
            (!selectedStation || selectedStation.id !== routeDestination.id)) {
            stationsToRender.push(routeDestination);
        }

        stationsToRender.forEach(station => {
            // Skip optimization removed to ensure deselected markers revert to dots
            // if (markersRef.current[station.id] && selectedStation?.id !== station.id) return;

            const isSelected = selectedStation?.id === station.id;

            // Determine colors
            let color = '#64748b'; // slate-500 default
            let fillColor = '#ffffff';
            let iconChar = '';
            let colorClass = '';

            switch (station.type.toLowerCase()) {
                case 'bus':
                    color = '#ef4444'; // red-500
                    colorClass = 'bg-red-500';
                    iconChar = '🚌';
                    break;
                case 'metro':
                    color = '#4f46e5'; // indigo-600
                    colorClass = 'bg-indigo-600';
                    iconChar = '🚇';
                    break;
                case 'bike':
                    color = '#22c55e'; // green-500
                    colorClass = 'bg-green-500';
                    iconChar = '🚲';
                    break;
                case 'scooter':
                    color = '#eab308'; // yellow-500
                    colorClass = 'bg-yellow-500';
                    iconChar = '🛴';
                    break;
                case 'minibus':
                    color = '#9333ea'; // purple-600
                    colorClass = 'bg-purple-600';
                    iconChar = '🚐';
                    break;
                case 'taxi':
                    color = '#eab308'; // yellow-500
                    colorClass = 'bg-yellow-500';
                    iconChar = '🚕';
                    break;
                case 'dolmus':
                    color = '#3b82f6'; // blue-500
                    colorClass = 'bg-blue-500';
                    iconChar = '🚐';
                    break;
            }

            if (station.status === 'maintenance') {
                color = '#9ca3af'; // gray-400
                colorClass = 'bg-gray-400';
                iconChar = '🔧';
            }

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

            // Use CircleMarker for non-selected stations when zoomed out or just generally for performance
            // Use DivIcon (Logo) ONLY for selected station

            if (isSelected) {
                // Render as detailed Icon
                const size = 'w-10 h-10 text-xl';
                const zIndex = 1000;

                const customIcon = L.divIcon({
                    className: 'bg-transparent',
                    html: `<div class="${colorClass} ${size} rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-all transform hover:scale-110 text-white font-bold cursor-pointer">
                        ${iconChar}
                       </div>`,
                    iconSize: [40, 40],
                    iconAnchor: [20, 20]
                });

                if (markersRef.current[station.id]) {
                    // If it was already a marker, check if it was a CircleMarker. If so, remove and replace.
                    // Or if it was a DivIcon, update it.
                    // Simplest approach: Remove and recreate if switching types, or just update icon.
                    // Since we are switching classes (CircleMarker vs Marker), we need to check instance.

                    const existingLayer = markersRef.current[station.id];
                    if (existingLayer instanceof L.CircleMarker) {
                        existingLayer.remove();
                        delete markersRef.current[station.id];
                        // Will be recreated below
                    } else {
                        // Update existing Marker
                        const marker = existingLayer as L.Marker;
                        marker.setIcon(customIcon);
                        marker.setZIndexOffset(zIndex);
                        // Update popup...
                        const oldContent = marker.getPopup()?.getContent();
                        if (oldContent !== popupContent) {
                            marker.setPopupContent(popupContent);
                            if (marker.isPopupOpen()) {
                                setTimeout(() => {
                                    const contentNode = marker.getPopup()?.getElement();
                                    if (contentNode) bindPopupButtons(contentNode);
                                }, 0);
                            }
                        }
                        return;
                    }
                }

                // Create new Marker
                const marker = L.marker([station.location.lat, station.location.lng], {
                    icon: customIcon,
                    zIndexOffset: zIndex
                })
                    .bindPopup(popupContent, { offset: [0, -10], autoClose: true })
                    .addTo(mapInstanceRef.current!)
                    .on('click', () => {
                        if (!isPickingLocation) {
                            onStationSelect(station);
                        }
                    });

                // Open popup if selected
                // Close other popups first to ensure single popup behavior
                mapInstanceRef.current!.closePopup();
                if (!marker.isPopupOpen()) {
                    marker.openPopup();
                }

                markersRef.current[station.id] = marker;

            } else {
                // Render as CircleMarker (Dot)

                // CRITICAL FIX: Check if existing is Marker (DivIcon), if so remove it to revert to Dot
                if (markersRef.current[station.id] && markersRef.current[station.id] instanceof L.Marker && !(markersRef.current[station.id] instanceof L.CircleMarker)) {
                    markersRef.current[station.id].remove();
                    delete markersRef.current[station.id];
                }

                if (markersRef.current[station.id]) {
                    // Update existing CircleMarker
                    const circle = markersRef.current[station.id] as L.CircleMarker;
                    circle.setStyle({ fillColor: color, color: '#fff' });

                    const oldContent = circle.getPopup()?.getContent();
                    if (oldContent !== popupContent) {
                        circle.setPopupContent(popupContent);
                        if (circle.isPopupOpen()) {
                            setTimeout(() => {
                                const contentNode = circle.getPopup()?.getElement();
                                if (contentNode) bindPopupButtons(contentNode);
                            }, 0);
                        }
                    }
                } else {
                    // Create new CircleMarker
                    const circle = L.circleMarker([station.location.lat, station.location.lng], {
                        radius: 6,
                        fillColor: color,
                        color: '#fff',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8
                    })
                        .bindPopup(popupContent, { autoClose: true })
                        .addTo(mapInstanceRef.current!)
                        .on('click', () => {
                            if (!isPickingLocation) {
                                onStationSelect(station);
                            }
                        });

                    markersRef.current[station.id] = circle as any; // Cast to any to store in map
                }
            }
        });
    }, [visibleStations, selectedStation, onStationSelect, isPickingLocation, routeDestination, showRoute]);

    const hasFittedRouteRef = useRef(false);

    // Reset fitted state when route destination changes or route is hidden
    useEffect(() => {
        hasFittedRouteRef.current = false;
    }, [routeDestination, showRoute]);

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

                        // Only fit bounds if we haven't done so for this route yet
                        if (!hasFittedRouteRef.current) {
                            mapInstanceRef.current!.fitBounds(L.latLngBounds(latLngs), { padding: [50, 50] });
                            hasFittedRouteRef.current = true;
                        }
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

                    if (!hasFittedRouteRef.current) {
                        mapInstanceRef.current!.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50] });
                        hasFittedRouteRef.current = true;
                    }
                }
            }
        };

        fetchRoute();

    }, [showRoute, userLocation, routeDestination, isPickingLocation]);

    // Center map on selection
    useEffect(() => {
        if (selectedStation && mapInstanceRef.current && !showRoute && !isPickingLocation) {
            // Use flyTo for better UX when moving to distant stations
            // This ensures the map loads tiles in the new area
            mapInstanceRef.current.flyTo([selectedStation.location.lat, selectedStation.location.lng], 16, {
                duration: 1.5 // Animation duration in seconds
            });
        }
    }, [selectedStation, showRoute, isPickingLocation]);

    return <div ref={mapContainerRef} className="h-full w-full bg-slate-200" />;
};

export default MapView;