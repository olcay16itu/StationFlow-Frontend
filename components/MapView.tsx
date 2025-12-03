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
            const newBtn = routeBtn.cloneNode(true);
            routeBtn.parentNode?.replaceChild(newBtn, routeBtn);

            newBtn.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
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

    const [zoomLevel, setZoomLevel] = React.useState(13);

    const isSwitchingPopup = useRef(false);

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
            disableClusteringAtZoom: 16, // Disable clustering at high zoom
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

        map.on('zoomend', () => {
            setZoomLevel(map.getZoom());
        });

        setMapInstance(map);

        return () => {
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

    // Handle Stations (Markers with Clustering)
    useEffect(() => {
        if (!mapInstance || !clusterGroupRef.current) return;

        const clusterGroup = clusterGroupRef.current;
        clusterGroup.clearLayers();

        const markers: L.Layer[] = [];

        stations.forEach(station => {
            const isSelected = selectedStation?.id === station.id;
            const isDestination = routeDestination?.id === station.id;

            // Determine colors
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

            // Determine button state based on route
            const isRouteActive = showRoute && routeDestination?.id === station.id;
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

            let marker: L.Marker;

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

                marker = L.marker([station.location.lat, station.location.lng], {
                    icon: customIcon,
                    zIndexOffset: 1000
                });

                if (isSelected) {
                    marker.bindPopup(popupContent, { offset: [0, -10], autoClose: true });
                    setTimeout(() => {
                        if (!marker.isPopupOpen()) marker.openPopup();
                    }, 100);
                } else {
                    marker.bindPopup(popupContent, { offset: [0, -10], autoClose: true });
                }

            } else {
                const circleIcon = L.divIcon({
                    className: 'bg-transparent',
                    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></div>`,
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                });

                marker = L.marker([station.location.lat, station.location.lng], {
                    icon: circleIcon
                }).bindPopup(popupContent, { autoClose: true });
            }

            marker.on('click', () => {
                if (!isPickingLocation) {
                    onStationSelect(station);
                }
            });

            markers.push(marker);
        });

        clusterGroup.addLayers(markers);

    }, [stations, selectedStation, routeDestination, showRoute, isPickingLocation, mapInstance]);

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
                                weight: 5,
                                opacity: 0.8,
                                lineCap: 'round',
                                lineJoin: 'round'
                            }).addTo(mapInstance);

                            if (!hasFittedRouteRef.current) {
                                mapInstance.fitBounds(L.latLngBounds(latLngs), { padding: [50, 50] });
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
                            weight: 4,
                            opacity: 0.7,
                            dashArray: '10, 10'
                        }).addTo(mapInstance);

                        if (!hasFittedRouteRef.current) {
                            mapInstance.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50] });
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

    // Center map on selection
    useEffect(() => {
        if (selectedStation && mapInstance && !showRoute && !isPickingLocation) {
            mapInstance.flyTo([selectedStation.location.lat, selectedStation.location.lng], 16, {
                duration: 1.5
            });
        }
    }, [selectedStation, showRoute, isPickingLocation, mapInstance]);

    return <div ref={mapContainerRef} className="h-full w-full bg-slate-200" />;
};

export default MapView;