import React, { useState, useEffect, useMemo, useRef } from 'react';
import MapView from './components/MapView';
import StationList from './components/StationList';
import AuthView from './components/AuthView';
import AddStationModal from './components/AddStationModal';
import AdminDashboard from './components/AdminDashboard';
import ReportStatusModal from './components/ReportStatusModal';
import { Station, UserLocation, TransportType, Location } from './types';
import { fetchStations, createStation, deleteStation, requestStationUpdate, fetchUpdateRequests, fetchFeedbacks } from './services/api';
import { MapPin, Menu, XCircle, ShieldAlert, X, MessageSquare } from 'lucide-react';
import FeedbackDashboard from './components/FeedbackDashboard';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const AppContent: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [routeDestination, setRouteDestination] = useState<Station | null>(null);
  const [filter, setFilter] = useState<TransportType | 'all'>('all');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showRoute, setShowRoute] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 640);

  // Auth & Management States
  const { user, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showFeedbackDashboard, setShowFeedbackDashboard] = useState(false);
  const [reportStation, setReportStation] = useState<Station | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);

  // Adding Station States
  const [showAddStation, setShowAddStation] = useState(false);
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<Location | null>(null);

  const dataFetchedRef = useRef(false);

  // Reload stations when user changes (login/logout)
  useEffect(() => {
    if (!isInitialLoading) {
      loadStations(false);
    }
    // Cleanup on logout
    if (!user) {
      setShowAddStation(false);
      setIsPickingLocation(false);
      setPendingRequestsCount(0);
    } else if (user.role === 'admin') {
      checkPendingRequests();
      checkFeedbackCount();
    }
  }, [user]);

  const checkFeedbackCount = async (count?: number) => {
    if (user?.role !== 'admin') return;

    if (typeof count === 'number') {
      setFeedbackCount(count);
      return;
    }

    try {
      const feedbacks = await fetchFeedbacks();
      setFeedbackCount(feedbacks.length);
    } catch (error) {
      console.error("Failed to fetch feedbacks", error);
    }
  };

  const checkPendingRequests = async (count?: number) => {
    if (user?.role !== 'admin') return;

    if (typeof count === 'number') {
      setPendingRequestsCount(count);
      return;
    }

    try {
      const requests = await fetchUpdateRequests();
      setPendingRequestsCount(requests.length);
    } catch (error) {
      console.error("Failed to fetch update requests", error);
    }
  };

  useEffect(() => {
    let watchId: number;

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });

          if (!dataFetchedRef.current) {
            loadStations(true);
            dataFetchedRef.current = true;
          }
        },
        (error) => {
          console.error("Location error:", error);
          if (!dataFetchedRef.current) {
            loadStations(true);
            dataFetchedRef.current = true;
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
      );
    } else {
      loadStations(true);
    }

    // SSE Subscription
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
    // Remove trailing slash if present to avoid double slashes
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    // Ensure we don't duplicate /api if it's already in the base URL
    const endpoint = cleanBaseUrl.endsWith('/api')
      ? '/notifications/subscribe'
      : '/api/notifications/subscribe';

    const eventSource = new EventSource(`${cleanBaseUrl}${endpoint}`);

    eventSource.addEventListener('station-update', (event) => {
      try {
        const updatedStation: Station = JSON.parse(event.data);
        setStations(prevStations =>
          prevStations.map(s => s.id === updatedStation.id ? updatedStation : s)
        );
        // Also update selected station if it's the one being updated
        setSelectedStation(prev => prev?.id === updatedStation.id ? updatedStation : prev);
      } catch (error) {
        console.error("Error parsing station update:", error);
      }
    });

    eventSource.addEventListener('heartbeat', (event) => {
      // Heartbeat received, connection is alive
      console.debug("SSE Heartbeat received");
    });

    eventSource.onerror = (error) => {
      console.error("SSE Error:", error);
      // Do NOT close explicitly, let the browser retry.
      // eventSource.close(); 

      // If readyState is CLOSED (2), we might want to try re-establishing after a delay if the browser doesn't.
      if (eventSource.readyState === EventSource.CLOSED) {
        // Browser usually handles this, but if we wanted custom logic we'd do it here.
      }
    };

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      eventSource.close();
    };
  }, []);

  const loadStations = async (showLoading = false) => {
    if (showLoading) setIsInitialLoading(true);
    try {
      const data = await fetchStations();
      setStations(data);
    } catch (e) {
      console.error("Failed to fetch stations", e);
    } finally {
      if (showLoading) setIsInitialLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    // Cleanup handled in useEffect
  };

  const handleAddStation = async (newStationData: Omit<Station, 'id' | 'lastUpdate'>) => {
    try {
      const station = await createStation({
        ...newStationData,
        ownerId: user?.id
      });

      setStations(prev => [...prev, station]);
      setShowAddStation(false);
      setPickedLocation(null);
      setSelectedStation(station);
    } catch (error: any) {
      alert("Durak eklenemedi: " + error.message);
    }
  };

  const handleDeleteStation = async (id: string) => {
    if (user?.role !== 'admin') return;

    try {
      await deleteStation(id);
      setStations(prev => prev.filter(s => s.id !== id));

      if (selectedStation?.id === id) {
        setSelectedStation(null);
      }

      if (routeDestination?.id === id) {
        setRouteDestination(null);
        setShowRoute(false);
      }
    } catch (error: any) {
      alert("Durak silinemedi: " + error.message);
    }
  };

  const startPickingLocation = () => {
    setShowAddStation(false);
    setIsSidebarOpen(false);
    setIsPickingLocation(true);
  };

  const handleLocationPicked = (loc: Location) => {
    setPickedLocation(loc);
    setIsPickingLocation(false);
    setShowAddStation(true);
    setIsSidebarOpen(window.innerWidth > 640);
  };

  const filteredStations = useMemo(() => {
    if (filter === 'all') return stations;
    return stations.filter(s => s.type.toLowerCase() === filter.toLowerCase());
  }, [stations, filter]);

  const handleStationSelect = (station: Station) => {
    setSelectedStation(station);
    if (window.innerWidth < 640) {
      setIsSidebarOpen(false);
    }
  };

  const handleDeselect = () => {
    setSelectedStation(null);
  };

  const handleFilterChange = (newFilter: TransportType | 'all') => {
    setFilter(newFilter);
    setSelectedStation(null);
    // Also reset view if needed, but MapView handles bounds update
  };

  const handleCreateRoute = () => {
    if (!userLocation || !selectedStation) {
      alert("Konum bilgisi veya istasyon seçimi eksik.");
      return;
    }
    setRouteDestination(selectedStation);
    setShowRoute(true);
    if (window.innerWidth < 640) {
      setIsSidebarOpen(false);
    }
  };

  const handleRemoveRoute = () => {
    setRouteDestination(null);
    setShowRoute(false);
  };

  const handleReportStatus = (stationId: string) => {
    if (!user) {
      alert("Lütfen önce giriş yapın.");
      setShowAuth(true);
      return;
    }

    const station = stations.find(s => s.id === stationId);
    if (station) {
      setReportStation(station);
      setShowReportModal(true);
    }
  };

  const handleSubmitReport = async (available: number) => {
    if (!reportStation) return;

    try {
      await requestStationUpdate(reportStation.id, available);
      alert("Güncelleme isteği gönderildi. Admin onayı bekleniyor.");
      setShowReportModal(false);
      setReportStation(null);
      if (user?.role === 'admin') {
        checkPendingRequests();
      }
    } catch (error: any) {
      alert("İstek gönderilemedi: " + error.message);
      throw error;
    }
  };

  if (isInitialLoading) {
    return (
      <div className="fixed inset-0 bg-slate-100 dark:bg-slate-900 z-[9999] flex flex-col items-center justify-center">
        <div className="relative flex h-20 w-20 mb-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-20 w-20 bg-blue-500 flex items-center justify-center">
            <MapPin size={40} className="text-white animate-bounce" />
          </span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">StationFlow</h2>
        <p className="text-slate-500 dark:text-slate-400 animate-pulse">Duraklar yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-slate-100 dark:bg-slate-900 transition-colors duration-300">

      {showAuth && (
        <AuthView onCancel={() => setShowAuth(false)} />
      )}

      {showAddStation && (
        <AddStationModal
          userLocation={userLocation}
          onAdd={handleAddStation}
          onClose={() => {
            setShowAddStation(false);
            setPickedLocation(null);
          }}
          onRequestPickLocation={startPickingLocation}
          pickedLocation={pickedLocation}
        />
      )}

      {/* Picking Location Banner */}
      {isPickingLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-[90%] sm:w-auto flex justify-center">
          <div className="bg-slate-800/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-xl animate-bounce flex flex-col sm:flex-row items-center gap-3 border border-slate-700">
            <div className="flex items-center gap-2">
              <MapPin size={20} className="text-yellow-400 shrink-0" />
              <span className="font-bold text-sm text-center">Haritada konumu seçin</span>
            </div>
            <button
              onClick={() => { setIsPickingLocation(false); setShowAddStation(true); }}
              className="bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border border-slate-600 w-full sm:w-auto"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Sidebar Toggle Button */}
      {!isSidebarOpen && !isPickingLocation && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-4 left-4 z-30 p-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1)] hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors animate-fade-in-up hover:scale-105 active:scale-95 border border-slate-100 dark:border-slate-700"
        >
          <Menu size={24} />
        </button>
      )}

      {/* Mobile Backdrop for Sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-30 sm:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <StationList
        stations={filteredStations}
        selectedStation={selectedStation}
        onSelect={handleStationSelect}
        onDelete={handleDeleteStation}
        onAddClick={() => setShowAddStation(true)}
        onLoginClick={() => setShowAuth(true)}
        onLogoutClick={handleLogout}
        filter={filter}
        setFilter={handleFilterChange}
        isLoading={isInitialLoading}
        isOpen={isSidebarOpen && !isPickingLocation}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="absolute inset-0 z-0">
        <MapView
          stations={filteredStations}
          userLocation={userLocation}
          selectedStation={selectedStation}
          routeDestination={routeDestination}
          onStationSelect={handleStationSelect}
          onDeselect={handleDeselect}
          showRoute={showRoute}
          isPickingLocation={isPickingLocation}
          onLocationPicked={handleLocationPicked}
          onCreateRoute={handleCreateRoute}
          onRemoveRoute={handleRemoveRoute}
          onReportStatus={handleReportStatus}
        />

        {showRoute && routeDestination && (
          <div className="absolute bottom-32 sm:bottom-10 left-0 right-0 z-[500] flex justify-center px-4 pointer-events-none pb-safe">
            <button
              onClick={handleRemoveRoute}
              className="pointer-events-auto bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-6 rounded-full shadow-[0_10px_40px_-10px_rgba(220,38,38,0.5)] transform transition-all hover:scale-105 active:scale-95 flex items-center gap-2 animate-fade-in-up border-2 border-white/20 max-w-[90%] truncate"
            >
              <XCircle size={24} className="shrink-0" />
              <span className="truncate">Rotayı Bitir ({routeDestination.name})</span>
            </button>
          </div>
        )}

        {/* Admin Dashboard Toggle */}
        {user?.role === 'admin' && (
          <>
            <div className="absolute top-24 right-4 z-[500] flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowAdminDashboard(!showAdminDashboard);
                  setShowFeedbackDashboard(false);
                }}
                className="bg-slate-800 text-white p-3 rounded-full shadow-lg hover:bg-slate-700 transition-colors relative"
                title="Admin Paneli"
              >
                <ShieldAlert size={24} />
                {pendingRequestsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-slate-100 dark:border-slate-900 min-w-[20px] text-center">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setShowFeedbackDashboard(!showFeedbackDashboard);
                  setShowAdminDashboard(false);
                }}
                className="bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors relative"
                title="Geri Bildirimler"
              >
                <MessageSquare size={24} />
                {feedbackCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-slate-100 dark:border-slate-900 min-w-[20px] text-center">
                    {feedbackCount}
                  </span>
                )}
              </button>
            </div>
          </>
        )}

        {/* Admin Dashboard Modal */}
        {showAdminDashboard && (
          <div className={`absolute inset-0 z-[600] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-300 ${isSidebarOpen && window.innerWidth > 640 ? 'left-80' : 'left-0'}`}>
            <div className="relative w-[95%] sm:w-full max-w-4xl max-h-[90vh] overflow-auto">
              <button
                onClick={() => setShowAdminDashboard(false)}
                className="absolute top-4 right-4 z-10 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
              >
                <X size={24} />
              </button>
              <AdminDashboard onActionComplete={checkPendingRequests} />
            </div>
          </div>
        )}

        {/* Feedback Dashboard Modal */}
        {showFeedbackDashboard && (
          <div className={`absolute inset-0 z-[600] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-300 ${isSidebarOpen && window.innerWidth > 640 ? 'left-80' : 'left-0'}`}>
            <div className="relative w-[95%] sm:w-full max-w-2xl">
              <FeedbackDashboard onClose={() => {
                setShowFeedbackDashboard(false);
                checkFeedbackCount();
              }} />
            </div>
          </div>
        )}

        {/* Report Status Modal */}
        {showReportModal && reportStation && (
          <ReportStatusModal
            station={reportStation}
            onClose={() => { setShowReportModal(false); setReportStation(null); }}
            onSubmit={handleSubmitReport}
          />
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;