import React, { useEffect, useRef, useState } from 'react';
import { Station, UserLocation, Location } from '../types';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

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
    const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
    const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
    const routeLayerRef = useRef<L.Polyline | null>(null);
    const userMarkerRef = useRef<L.Marker | null>(null);

    // Use refs to store the latest version of callbacks to avoid stale closures
    const onCreateRouteRef = useRef(onCreateRoute);
    const onRemoveRouteRef = useRef(onRemoveRoute);
    const onReportStatusRef = useRef(onReportStatus);
    const onDeselectRef = useRef(onDeselect);

    const [zoomLevel, setZoomLevel] = React.useState(13);
    const isSwitchingPopup = useRef(false);

    useEffect(() => {
        onCreateRouteRef.current = onCreateRoute;
        onRemoveRouteRef.current = onRemoveRoute;
        onReportStatusRef.current = onReportStatus;
        onDeselectRef.current = onDeselect;
    }, [onCreateRoute, onRemoveRoute, onReportStatus, onDeselect]);

    // Initialize Map
    useEffect(() => {
        if (!mapContainerRef.current || mapInstance) return;

        const initialLat = userLocation ? userLocation.lat : 41.0082;
        const initialLng = userLocation ? userLocation.lng : 28.9784;

        const map = L.map(mapContainerRef.current, {
            zoomControl: false,
            preferCanvas: true
        }).setView([initialLat, initialLng], 13);

        L.control.zoom({ position: 'topright' }).addTo(map);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        // Initialize Cluster Group
        const clusterGroup = L.markerClusterGroup({
            showCoverageOnHover: false,
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            disableClusteringAtZoom: 16,
            iconCreateFunction: function (cluster) {
                const count = cluster.getChildCount();
                let c = ' marker-cluster-';
                if (count < 10) {
                    c += 'small';
                } else if (count < 100) {
                    c += 'medium';
                } else {
                    c += 'large';
                }

                return new L.DivIcon({
                    html: '<div><span>' + count + '</span></div>',
                    className: 'marker-cluster' + c,
                    iconSize: new L.Point(40, 40)
                });
            }
        });
        map.addLayer(clusterGroup);
        clusterGroupRef.current = clusterGroup;

        // Global listener for popup open to handle switching state
        map.on('popupopen', () => {
            isSwitchingPopup.current = false;
        });

        // Global listener for popup close to handle deselection
        map.on('popupclose', (e) => {
            isSwitchingPopup.current = true;
            setTimeout(() => {
                if (isSwitchingPopup.current) {
                    if (onDeselectRef.current) {
                        onDeselectRef.current();
                    }
                    isSwitchingPopup.current = false;
                }
            }, 200);
        });

        // Event Delegation for Popup Buttons
        const handleGlobalClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // Handle Route Button
            const routeBtn = target.closest('.route-btn');
            if (routeBtn) {
                e.preventDefault();
                e.stopPropagation();
                const action = routeBtn.getAttribute('data-action');
                if (action === 'remove' && onRemoveRouteRef.current) {
                    onRemoveRouteRef.current();
                } else if (onCreateRouteRef.current) {
                    onCreateRouteRef.current();
                }
                return;
            }

            // Handle Report Button
            const reportBtn = target.closest('.report-btn');
            if (reportBtn) {
                e.preventDefault();
                e.stopPropagation();
                const stationId = reportBtn.getAttribute('data-station-id');
                if (stationId && onReportStatusRef.current) {
                    onReportStatusRef.current(stationId);
                }
                return;
            }
        };

        if (mapContainerRef.current) {
            mapContainerRef.current.addEventListener('click', handleGlobalClick);
        }

        map.on('zoomend', () => {
            setZoomLevel(map.getZoom());
        });

        setMapInstance(map);

        return () => {
            if (mapContainerRef.current) {
                mapContainerRef.current.removeEventListener('click', handleGlobalClick);
            }
            map.remove();
            setMapInstance(null);
        };
    }, []);

    // Handle "Picking Location" Mode
    useEffect(() => {
        if (!mapInstance) return;

        if (isPickingLocation) {
            if (mapContainerRef.current) {
                mapContainerRef.current.style.cursor = 'crosshair';
            }

            const handler = (e: L.LeafletMouseEvent) => {
                if (onLocationPicked) {
                    onLocationPicked({ lat: e.latlng.lat, lng: e.latlng.lng });
                }
            };

            mapInstance.on('click', handler);

            return () => {
                mapInstance.off('click', handler);
                if (mapContainerRef.current) {
                    mapContainerRef.current.style.cursor = '';
                }
            };
        }
    }, [isPickingLocation, onLocationPicked, mapInstance]);

    // Handle User Location Update
    useEffect(() => {
        if (!mapInstance || !userLocation) return;

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

            // Add to map directly, NOT to cluster group
            userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
                icon: userIcon,
                zIndexOffset: 2000 // High z-index to stay on top
            })
                .addTo(mapInstance)
                .bindPopup("Konumunuz");

            // Only fly to location on first load or if not selecting a station
            if (!selectedStation) {
                mapInstance.flyTo([userLocation.lat, userLocation.lng], 14);
            }
        } else {
            userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
        }
    }, [userLocation, mapInstance]); // Added mapInstance dependency

    const markersMapRef = useRef<Map<string, L.Marker>>(new Map());

    // 1. Render Markers (Only when stations list changes)
    useEffect(() => {
        if (!mapInstance || !clusterGroupRef.current) return;

        const clusterGroup = clusterGroupRef.current;
        clusterGroup.clearLayers();
        markersMapRef.current.clear();

        const markers: L.Layer[] = [];

        stations.forEach(station => {
            let color = '#64748b';
            switch (station.type.toLowerCase()) {
                case 'bus': color = '#ef4444'; break;
                case 'metro': color = '#4f46e5'; break;
                case 'bike': color = '#22c55e'; break;
                case 'scooter': color = '#eab308'; break;
                case 'minibus': color = '#9333ea'; break;
                case 'taxi': color = '#eab308'; break;
                case 'dolmus': color = '#3b82f6'; break;
            }
            if (station.status === 'maintenance') {
                color = '#9ca3af';
            }

            const circleIcon = L.divIcon({
                className: 'bg-transparent',
                html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></div>`,
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            });

            const marker = L.marker([station.location.lat, station.location.lng], {
                icon: circleIcon
            });

            // Initial popup content (will be updated by selection effect)
            marker.bindPopup("Loading...", { autoClose: true, offset: [0, -10] });

            marker.on('click', () => {
                if (!isPickingLocation) {
                    onStationSelect(station);
                }
            });

            markers.push(marker);
            markersMapRef.current.set(station.id, marker);
        });

        clusterGroup.addLayers(markers);
    }, [stations, mapInstance, isPickingLocation]); // Only rebuild if stations change

    // 2. Handle Selection & Visual Updates (Icons, Popups, Animation)
    useEffect(() => {
        if (!mapInstance || !clusterGroupRef.current) return;

        const clusterGroup = clusterGroupRef.current;

        stations.forEach(station => {
            const marker = markersMapRef.current.get(station.id);
            if (!marker) return;

            const isSelected = selectedStation?.id === station.id;
            const isDestination = routeDestination?.id === station.id;
            const isRouteActive = showRoute && routeDestination?.id === station.id;

            // Update Icon
            let color = '#64748b';
            let colorClass = '';
            let iconChar = '';

            switch (station.type.toLowerCase()) {
                case 'bus': color = '#ef4444'; colorClass = 'bg-red-500'; iconChar = '🚌'; break;
                case 'metro': color = '#4f46e5'; colorClass = 'bg-indigo-600'; iconChar = '🚇'; break;
                case 'bike': color = '#22c55e'; colorClass = 'bg-green-500'; iconChar = '🚲'; break;
                case 'scooter': color = '#eab308'; colorClass = 'bg-yellow-500'; iconChar = '🛴'; break;
                case 'minibus': color = '#9333ea'; colorClass = 'bg-purple-600'; iconChar = '🚐'; break;
                case 'taxi': color = '#eab308'; colorClass = 'bg-yellow-500'; iconChar = '🚕'; break;
                case 'dolmus': color = '#3b82f6'; colorClass = 'bg-blue-500'; iconChar = '🚐'; break;
            }
            if (station.status === 'maintenance') {
                color = '#9ca3af'; colorClass = 'bg-gray-400'; iconChar = '🔧';
            }

            if (isSelected || isDestination) {
                const size = 'w-10 h-10 text-xl';
                const customIcon = L.divIcon({
                    className: 'bg-transparent',
                    html: `<div class="${colorClass} ${size} rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-all transform hover:scale-110 text-white font-bold cursor-pointer">
                        ${iconChar}
                       </div>`,
                    iconSize: [40, 40],
                    iconAnchor: [20, 20]
                });
                marker.setIcon(customIcon);
                marker.setZIndexOffset(1000);
            } else {
                const circleIcon = L.divIcon({
                    className: 'bg-transparent',
                    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></div>`,
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                });
                marker.setIcon(circleIcon);
                marker.setZIndexOffset(0);
            }

            // Update Popup Content
            const btnText = isRouteActive ? 'Rotayı Bitir' : 'Rota Oluştur';
            const btnColor = isRouteActive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700';
            const action = isRouteActive ? 'remove' : 'create';

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
            marker.setPopupContent(popupContent);
        });

        // Handle FlyTo and OpenPopup for Selected Station
        if (selectedStation && !showRoute && !isPickingLocation) {
            const marker = markersMapRef.current.get(selectedStation.id);
            if (marker) {
                const currentZoom = mapInstance.getZoom();
                const targetZoom = 16;

                // Always try to open popup, even if already there
                const openPopupSafe = () => {
                    if (clusterGroup.hasLayer(marker)) {
                        clusterGroup.zoomToShowLayer(marker, () => {
                            marker.openPopup();
                        });
                    } else {
                        marker.openPopup();
                    }
                };

                if (currentZoom < targetZoom) {
                    mapInstance.flyTo(marker.getLatLng(), targetZoom, { duration: 1.5 });

                    let timeoutId: NodeJS.Timeout;
                    const onMoveEnd = () => {
                        openPopupSafe();
                        mapInstance.off('moveend', onMoveEnd);
                        clearTimeout(timeoutId);
                    };

                    mapInstance.once('moveend', onMoveEnd);
                    timeoutId = setTimeout(onMoveEnd, 1600);

                    return () => {
                        mapInstance.off('moveend', onMoveEnd);
                        clearTimeout(timeoutId);
                    };
                } else {
                    mapInstance.panTo(marker.getLatLng());
                    openPopupSafe();
                }
            }
        }

    }, [selectedStation, routeDestination, showRoute, isPickingLocation, mapInstance, stations]); // Re-run when selection/route changes

    const hasFittedRouteRef = useRef(false);

    // Reset fitted state when route destination changes or route is hidden
    useEffect(() => {
        hasFittedRouteRef.current = false;
    }, [routeDestination, showRoute]);

    // Handle Route Drawing with OSRM
    useEffect(() => {
        if (!mapInstance) return;

        // Cleanup previous route immediately
        if (routeLayerRef.current) {
            routeLayerRef.current.remove();
            routeLayerRef.current = null;
        }

        let isCancelled = false;

        const fetchRoute = async () => {
            if (showRoute && userLocation && routeDestination && !isPickingLocation) {
                try {
                    const url = `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${routeDestination.location.lng},${routeDestination.location.lat}?overview=full&geometries=geojson`;

                    const response = await fetch(url);
                    const data = await response.json();

                    if (isCancelled) return;

                    if (data.routes && data.routes.length > 0) {
                        const geometry = data.routes[0].geometry;
                        const latLngs = geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);

                        // Double check before adding to map
                        if (!isCancelled) {
                            routeLayerRef.current = L.polyline(latLngs, {
                                color: '#3b82f6',
                                weight: 6, // Thicker line for mobile visibility
                                opacity: 0.9,
                                lineCap: 'round',
                                lineJoin: 'round'
                            }).addTo(mapInstance);

                            if (!hasFittedRouteRef.current) {
                                // Add more padding for mobile
                                mapInstance.fitBounds(L.latLngBounds(latLngs), { padding: [80, 80] });
                                hasFittedRouteRef.current = true;
                            }
                        }
                    }
                } catch (error) {
                    console.error("Routing error:", error);
                    if (isCancelled) return;

                    const latlngs: [number, number][] = [
                        [userLocation.lat, userLocation.lng],
                        [routeDestination.location.lat, routeDestination.location.lng]
                    ];

                    if (!isCancelled) {
                        routeLayerRef.current = L.polyline(latlngs, {
                            color: '#ef4444',
                            weight: 5,
                            opacity: 0.8,
                            dashArray: '10, 10'
                        }).addTo(mapInstance);

                        if (!hasFittedRouteRef.current) {
                            mapInstance.fitBounds(L.latLngBounds(latlngs), { padding: [80, 80] });
                            hasFittedRouteRef.current = true;
                        }
                    }
                }
            }
        };

        fetchRoute();

        return () => {
            isCancelled = true;
            if (routeLayerRef.current) {
                routeLayerRef.current.remove();
                routeLayerRef.current = null;
            }
        };

    }, [showRoute, userLocation, routeDestination, isPickingLocation, mapInstance]);

    return <div ref={mapContainerRef} className="h-full w-full bg-slate-200" />;
};

export default MapView;