// src/pages/OfficeLocator.jsx — Interactive WBSEDCL office finder with map

import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Phone, ExternalLink, Navigation, Compass, Loader2, RefreshCw } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';

export default function OfficeLocator() {
  const { isDark } = useTheme();
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  
  // Geolocation states
  const [userCoords, setUserCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Unique list of districts for the filter dropdown
  const districtsList = [
    'North 24 Parganas',
    'South 24 Parganas',
    'Howrah',
    'Hooghly',
    'Purba Medinipur',
    'Paschim Medinipur',
    'Purba Bardhaman',
    'Paschim Bardhaman',
    'Nadia',
    'Murshidabad',
    'Malda',
    'Darjeeling',
    'Jalpaiguri',
    'Cooch Behar',
    'Birbhum',
    'Bankura',
    'Purulia'
  ];

  // Leaflet map reference
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);

  // Load user profile on mount to default to their registered district
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/api/v1/auth/me');
        setUserProfile(res.data);
        if (res.data?.district) {
          setSelectedDistrict(res.data.district);
        }
      } catch (err) {
        console.error('Failed to load user profile in locator:', err);
      }
    };
    fetchProfile();
  }, []);

  // Fetch offices from the backend on load
  const fetchOffices = async () => {
    setLoading(true);
    setError('');
    try {
      let url = '/api/v1/offices';
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedDistrict) params.district = selectedDistrict;
      if (selectedType) params.type = selectedType;

      const res = await api.get(url, { params });
      setOffices(res.data);
    } catch (err) {
      console.error(err);
      setError('Could not fetch office locations. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch offices when search or dropdowns change
  useEffect(() => {
    fetchOffices();
  }, [searchTerm, selectedDistrict, selectedType]);

  // Geolocation Handler — request user location and recalculate distances
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });

        try {
          // Fetch nearest offices sorted by distance from backend
          const res = await api.get('/api/v1/offices/nearby', {
            params: { lat: latitude, lng: longitude, limit: 10 }
          });
          
          setOffices(res.data);
          
          // Pan map to user's location
          if (mapRef.current && window.L) {
            mapRef.current.setView([latitude, longitude], 11);
            
            // Add user location marker
            if (userMarkerRef.current) {
              mapRef.current.removeLayer(userMarkerRef.current);
            }
            
            // Neon glowing amber marker for user
            const userIcon = window.L.divIcon({
              className: 'user-pin-icon',
              html: `<div class="relative flex items-center justify-center">
                       <span class="absolute inline-flex h-8 w-8 animate-ping rounded-full bg-amber-500 opacity-75"></span>
                       <div class="relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-amber-600 shadow-lg shadow-amber-500/50">
                         <div class="h-1.5 w-1.5 rounded-full bg-white"></div>
                       </div>
                     </div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            });
            
            userMarkerRef.current = window.L.marker([latitude, longitude], { icon: userIcon })
              .addTo(mapRef.current)
              .bindPopup('<b class="text-slate-800">You Are Here</b>')
              .openPopup();
          }
        } catch (err) {
          console.error(err);
          alert('Failed to calculate nearby offices. Panning to your location instead.');
          if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], 12);
          }
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        console.error(error);
        setLocating(false);
        alert(`Location access denied or unavailable: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Initialize and update the Leaflet Map
  useEffect(() => {
    if (!window.L) return;

    // 1. Create Map Instance if it doesn't exist
    if (!mapRef.current) {
      // Centered generally in West Bengal, India
      mapRef.current = window.L.map('office-map', {
        zoomControl: false, // will add custom position below
      }).setView([22.5726, 88.3639], 9);

      // Add zoom control at bottom-right for sleekness
      window.L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
    }

    // 2. Select Tile Layer based on Dark / Light theme
    // We remove old tile layers first
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof window.L.TileLayer) {
        mapRef.current.removeLayer(layer);
      }
    });

    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' // Premium CartoDB Dark Matter
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'; // Premium CartoDB Voyager

    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

    window.L.tileLayer(tileUrl, { attribution, maxZoom: 19 }).addTo(mapRef.current);

  }, [isDark]);

  // Update map markers when offices state updates
  useEffect(() => {
    if (!mapRef.current || !window.L) return;

    // Clear old markers
    markersRef.current.forEach((marker) => {
      mapRef.current.removeLayer(marker);
    });
    markersRef.current = [];

    if (offices.length === 0) return;

    // Add new markers
    const bounds = [];

    offices.forEach((office) => {
      const { lat, lng, name, address, phone, type, distance_km } = office;
      if (lat && lng) {
        bounds.push([lat, lng]);

        // Premium custom neon cyan marker for offices
        const officeIcon = window.L.divIcon({
          className: 'office-pin-icon',
          html: `<div class="relative flex items-center justify-center">
                   <span class="absolute inline-flex h-8 w-8 animate-pulse rounded-full bg-indigo-500/30 opacity-70"></span>
                   <div class="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-indigo-400 bg-indigo-600 shadow-glow transition-all hover:scale-110">
                     <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                       <path d="m12 3-1.912 5.886a1 1 0 0 1-.95.686H2.936l4.981 3.62a1 1 0 0 1 .364 1.122L6.37 20.2l4.981-3.62a1 1 0 0 1 1.196 0l4.981 3.62-1.912-5.886a1 1 0 0 1 .364-1.122l4.981-3.62h-6.202a1 1 0 0 1-.95-.686Z"/>
                     </svg>
                   </div>
                 </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const popupContent = `
          <div class="p-2 text-slate-800 font-sans max-w-xs">
            <h4 class="font-bold text-sm text-indigo-900 mb-1">${name}</h4>
            <span class="inline-block px-2 py-0.5 mb-2 text-[10px] font-bold rounded bg-indigo-100 text-indigo-700 uppercase tracking-wide">${type}</span>
            <p class="text-xs text-slate-600 mb-2 leading-tight"><b class="text-slate-800">Address:</b> ${address}</p>
            ${phone ? `<p class="text-xs text-slate-600 mb-2 flex items-center gap-1"><b class="text-slate-800">Phone:</b> <a href="tel:${phone}" class="text-indigo-600 hover:underline font-semibold">${phone}</a></p>` : ''}
            ${distance_km !== undefined ? `<p class="text-xs font-bold text-emerald-600 mb-2">${distance_km} km away</p>` : ''}
            <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" rel="noopener noreferrer" class="mt-1 flex items-center justify-center gap-1.5 bg-indigo-600 text-white rounded px-3 py-1.5 text-[11px] font-bold hover:bg-indigo-700 transition-colors no-underline">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg> Get Directions
            </a>
          </div>
        `;

        const marker = window.L.marker([lat, lng], { icon: officeIcon })
          .addTo(mapRef.current)
          .bindPopup(popupContent);

        // Marker click updates state
        marker.on('click', () => {
          setSelectedOffice(office);
        });

        markersRef.current.push(marker);
      }
    });

    // Fit map bounds to encompass all loaded office locations + user location
    if (bounds.length > 0) {
      if (userCoords) bounds.push([userCoords.lat, userCoords.lng]);
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [offices, userCoords]);

  // Clean up Leaflet on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Pan map directly to specific office when selected
  const handleSelectOffice = (office) => {
    setSelectedOffice(office);
    if (mapRef.current && office.lat && office.lng) {
      mapRef.current.setView([office.lat, office.lng], 14);
      
      // Find corresponding marker and trigger popup
      const idx = offices.findIndex((o) => o.name === office.name);
      if (idx !== -1 && markersRef.current[idx]) {
        markersRef.current[idx].openPopup();
      }
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDistrict('');
    setSelectedType('');
    setUserCoords(null);
    if (userMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
    fetchOffices();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-2 flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-glow">
              <MapPin size={26} className="text-white" />
            </div>
            Nearby Office Locator
          </h1>
          <p className="text-slate-400 text-sm">
            Find the nearest West Bengal State Electricity Distribution Company Limited (WBSEDCL) office to physically submit your dispute letter or register complains.
          </p>
        </div>

        {/* Locate Me Button */}
        <motion.button
          id="locate-me-btn"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLocateUser}
          disabled={locating}
          className="btn-primary py-3 px-6 text-sm flex items-center justify-center gap-2 w-full md:w-auto shrink-0 shadow-glow"
        >
          {locating ? (
            <>
              <Loader2 size={18} className="animate-spin text-white" />
              Acquiring Coordinates…
            </>
          ) : (
            <>
              <Compass size={18} className="text-white" />
              Locate Nearest Office
            </>
          )}
        </motion.button>
      </div>

      {/* Filter panel */}
      <div className="glass-panel p-6 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        {/* Search */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Search Office Name/Address</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              id="office-search-input"
              type="text"
              className="glass-input pl-10 w-full"
              placeholder="e.g. Salt Lake, Siliguri..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* District select */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">District</label>
          <select
            id="district-select"
            className="glass-input w-full bg-themed-input cursor-pointer"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
          >
            <option value="">All Districts</option>
            {districtsList.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Type select */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Office Type</label>
          <select
            id="office-type-select"
            className="glass-input w-full bg-themed-input cursor-pointer"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="Customer Care Center">Customer Care Center (CCC)</option>
            <option value="Divisional Office">Divisional Office</option>
          </select>
        </div>

        {/* Reset filters */}
        <button
          id="reset-locator-filters-btn"
          onClick={clearFilters}
          className="btn-secondary w-full py-2.5 flex items-center justify-center gap-2 hover:bg-slate-700/60"
        >
          <RefreshCw size={14} /> Clear All
        </button>
      </div>

      {/* Main split dashboard (Map + Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[600px]">
        
        {/* Left Side: Interactive Map */}
        <div className="lg:col-span-8 flex flex-col glass-panel-premium overflow-hidden p-1 min-h-[400px] lg:min-h-0 border border-slate-700/50 shadow-2xl relative">
          {/* Geolocation visual HUD */}
          {userCoords && (
            <div className="absolute top-4 left-4 z-40 bg-emerald-600/90 backdrop-blur text-white text-xs px-3 py-1.5 rounded-lg border border-emerald-400/30 flex items-center gap-2 shadow-lg">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse"></span>
              <span>GPS Connected: Calculated Nearest Offices</span>
            </div>
          )}
          
          <div
            id="office-map"
            className="w-full h-full rounded-2xl min-h-[450px] lg:min-h-[580px] z-10"
            style={{ background: 'var(--bg-base)' }}
          ></div>
        </div>

        {/* Right Side: Scrollable Offices Panel */}
        <div className="lg:col-span-4 flex flex-col max-h-[600px]">
          <div className="glass-panel p-4 mb-4 flex items-center justify-between">
            <span className="text-sm font-bold text-white uppercase tracking-wider">
              Offices Found ({offices.length})
            </span>
            {userCoords && (
              <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded px-2.5 py-0.5 font-bold uppercase">
                Sorted By Nearest
              </span>
            )}
          </div>

          {userProfile?.district && selectedDistrict === userProfile.district && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded-2xl text-xs flex items-start gap-2.5 shadow-lg shadow-indigo-500/5 animate-fadeIn"
            >
              <span className="h-2 w-2 mt-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0"></span>
              <div>
                <p className="font-semibold text-white mb-0.5">Your Registered Location</p>
                <p className="opacity-80">Showing nearest offices recommended for your registered district: <b className="text-indigo-200">{userProfile.district}</b>.</p>
              </div>
            </motion.div>
          )}

          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 glass-panel">
                <Loader2 size={32} className="animate-spin text-indigo-400" />
                <span className="text-sm">Fetching nearest offices…</span>
              </div>
            ) : offices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center glass-panel px-4">
                <MapPin size={40} className="text-indigo-400 mb-3 opacity-60 animate-bounce" />
                <h3 className="font-bold text-white mb-1">No Offices Found</h3>
                <p className="text-slate-400 text-xs max-w-xs mb-4">
                  We couldn't find any offices matching your search or filters. Try adjusting your constraints.
                </p>
                <button onClick={clearFilters} className="btn-secondary py-1.5 px-4 text-xs">
                  Reset Search Options
                </button>
              </div>
            ) : (
              <AnimatePresence>
                {offices.map((office, index) => {
                  const isSelected = selectedOffice?.name === office.name;
                  return (
                    <motion.div
                      key={office.name}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: index * 0.05 }}
                      className={`glass-panel p-5 cursor-pointer border hover:border-indigo-500/50 hover:bg-slate-800/40 transition-all ${
                        isSelected
                          ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.25)] bg-slate-800/60'
                          : 'border-slate-800/50'
                      }`}
                      onClick={() => handleSelectOffice(office)}
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-bold text-sm text-themed-heading group-hover:text-indigo-400 transition-colors">
                          {office.name}
                        </h3>
                        <span className={`shrink-0 px-2 py-0.5 text-[9px] font-extrabold uppercase rounded border ${
                          office.type.includes('Divisional')
                            ? 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                            : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                        }`}>
                          {office.type.includes('Divisional') ? 'Div' : 'CCC'}
                        </span>
                      </div>

                      {/* District & Distance */}
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className="text-[11px] text-themed-muted font-medium flex items-center gap-1">
                          <MapPin size={11} className="text-slate-500" />
                          {office.district}
                        </span>
                        {office.distance_km !== undefined && (
                          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5 flex items-center gap-1">
                            <Navigation size={10} className="text-emerald-400 rotate-45" />
                            {office.distance_km} km away
                          </span>
                        )}
                      </div>

                      {/* Address */}
                      <p className="text-xs text-themed-secondary mb-4 leading-relaxed line-clamp-2">
                        {office.address}
                      </p>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 border-t pt-3 border-slate-800/60 mt-1">
                        {office.phone && (
                          <a
                            href={`tel:${office.phone}`}
                            className="btn-secondary py-2 flex-1 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-700/80"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone size={12} className="text-slate-400" /> Call
                          </a>
                        )}
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${office.lat},${office.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary py-2 flex-1 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-none hover:shadow-none bg-indigo-600 hover:bg-indigo-500"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Directions <ExternalLink size={12} className="text-white" />
                        </a>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
