import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../lib/supabase';

function MapBoundsUpdater({ bins, complaints }) {
  const map = useMap();
  useEffect(() => {
    const points = [];
    bins.forEach(b => { if(b.lat && b.lng) points.push([b.lat, b.lng]) });
    complaints.forEach(c => {
       if (c.location) {
         const [lat, lng] = c.location.split(',').map(s => parseFloat(s.trim()));
         if(!isNaN(lat) && !isNaN(lng)) points.push([lat, lng]);
       }
    });
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [bins, complaints, map]);
  return null;
}
import { BellRing, Trash2, AlertTriangle, LayoutDashboard, BarChart2, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import toast, { Toaster } from 'react-hot-toast';
import L from 'leaflet';

// Create custom icons
const createIcon = (className) => L.divIcon({
  className: 'bg-transparent',
  html: `<div class="${className}"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const safeIcon = createIcon('safe-marker');
const dangerIcon = createIcon('pulsing-marker');

export default function AdminDashboard() {
  const [bins, setBins] = useState([]);
  const [complaintsCount, setComplaintsCount] = useState(0);
  const [complaints, setComplaints] = useState([]);
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    fetchData();

    const channelBins = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'smart_bins' },
        (payload) => {
          const updatedBin = payload.new;
          setBins(current => current.map(b => b.id === updatedBin.id ? updatedBin : b));
          
          if (updatedBin.fill_level > 90) {
            toast.error(`Alert! Bin #${updatedBin.id} is unsafe (${updatedBin.fill_level}% full)`, {
              icon: '⚠️',
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    const channelComplaints = supabase
      .channel('schema-complaints-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'complaints' },
        (payload) => {
          fetchData(); 
          if (payload.eventType === 'INSERT') {
            toast.success('New Citizen Report received!', { icon: '🚨' });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelBins);
      supabase.removeChannel(channelComplaints);
    };
  }, []);

  const fetchData = async () => {
    const { data: binsData } = await supabase.from('smart_bins').select('*');
    if (binsData) setBins(binsData);

    const { data: compData } = await supabase.from('complaints').select('*');
    if (compData) {
      setComplaintsCount(compData.length);
      setComplaints(compData);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    toast.loading(`Marking as ${newStatus}...`, { id: `status-${id}` });
    const { error } = await supabase.from('complaints').update({ status: newStatus }).eq('id', id);
    if (error) {
      toast.error('Failed to update status', { id: `status-${id}` });
    } else {
      toast.success(`Complaint marked as ${newStatus}`, { id: `status-${id}` });
      fetchData();
    }
  };

  const totalFull = bins.filter(b => b.fill_level > 90).length;

  return (
    <div className="flex h-screen bg-neutral-100 overflow-hidden font-sans">
      <Toaster position="top-right" />
      
      {/* Sidebar - Pro Dark Design */}
      <aside className="w-80 bg-neutral-900 text-neutral-100 flex flex-col shadow-2xl z-20 border-r border-white/5">
        <div className="p-8 flex items-center gap-4 border-b border-white/5 bg-white/2 overflow-hidden relative group">
          <div className="absolute inset-0 bg-primary-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg shadow-primary-500/20">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div className="relative z-10">
            <h1 className="text-xl font-bold tracking-tight">SmartBin <span className="text-primary-500">Pro</span></h1>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.2em] mt-0.5">Control Terminal</p>
          </div>
        </div>
        
        <div className="p-8 flex-1 space-y-8 overflow-y-auto">
          <div>
            <h2 className="text-[11px] font-bold text-neutral-500 uppercase tracking-[0.15em] mb-6 ml-1">Live Intelligence</h2>
            
            <div className="space-y-4">
              <div className="premium-card bg-neutral-800/40 rounded-[1.5rem] p-6 border border-white/5 hover:border-red-500/30 group transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-red-500/10 rounded-xl group-hover:scale-110 transition-transform">
                    <Trash2 className="w-6 h-6 text-red-500" />
                  </div>
                  <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-lg uppercase tracking-wider">High Alert</span>
                </div>
                <p className="text-4xl font-bold text-white tracking-tight">{totalFull}</p>
                <p className="text-xs text-neutral-400 mt-2 font-medium">Critical Bins (&gt;90%)</p>
              </div>
              
              <div className="premium-card bg-neutral-800/40 rounded-[1.5rem] p-6 border border-white/5 hover:border-amber-500/30 group transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-amber-500/10 rounded-xl group-hover:scale-110 transition-transform">
                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                  </div>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg uppercase tracking-wider">Reports</span>
                </div>
                <p className="text-4xl font-bold text-white tracking-tight">{complaintsCount}</p>
                <p className="text-xs text-neutral-400 mt-2 font-medium">Active Citzen Reports</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-neutral-800/20 backdrop-blur-md mt-auto flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center border border-white/10 shadow-inner">
              <BellRing className="w-5 h-5 text-neutral-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full border-2 border-neutral-900 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-bold text-white tracking-tight">System Admin</p>
            <p className="text-[11px] text-neutral-500 font-medium italic">Active Session • Live</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 relative">
        <MapContainer 
          center={[51.505, -0.09]} 
          zoom={13} 
          className="w-full h-full z-0"
          zoomControl={false}
        >
          <MapBoundsUpdater bins={bins} complaints={complaints} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {bins.map((bin) => (
            <Marker
              key={bin.id}
              position={[bin.lat, bin.lng]}
              icon={bin.fill_level > 90 ? dangerIcon : safeIcon}
            >
              <Popup className="rounded-2xl overflow-hidden shadow-2xl border-0">
                <div className="p-3 w-48">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-neutral-900">Unit ID: #{bin.id}</h3>
                    <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${bin.fill_level > 90 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {bin.fill_level > 90 ? 'Full' : 'Optimal'}
                    </div>
                  </div>
                  <div className="relative h-3 bg-neutral-100 rounded-full overflow-hidden border border-neutral-200/50">
                    <div 
                      className={`h-full transition-all duration-1000 ease-out fill-animation ${bin.fill_level > 90 ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-green-400'}`}
                      style={{ width: `${Math.min(bin.fill_level, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2.5">
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Current Fill</p>
                    <p className="text-[10px] text-neutral-900 font-bold">{bin.fill_level}%</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
          {complaints.filter(c => c.location).map((comp) => {
             const [lat, lng] = comp.location.split(',').map(s => parseFloat(s.trim()));
             if (isNaN(lat) || isNaN(lng)) return null;
             return (
               <Marker key={`comp-${comp.id}`} position={[lat, lng]} icon={createIcon('w-8 h-8 rounded-full bg-amber-500 border-2 border-white shadow-lg shadow-amber-500/50 flex items-center justify-center animate-bounce duration-1000')}>
                 <Popup className="rounded-2xl overflow-hidden shadow-2xl border-0">
                    <div className="p-3 w-48">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-amber-600 text-xs uppercase tracking-wider">{comp.type} Report</h3>
                        <span className="text-[9px] bg-neutral-100 px-2 py-0.5 rounded-full font-bold text-neutral-500">{comp.status || 'Pending'}</span>
                      </div>
                      <p className="text-xs font-medium text-neutral-600 mb-3">{comp.description}</p>
                      {comp.image_url && <img src={comp.image_url} alt="Evidence" className="w-full h-24 object-cover rounded-xl shadow-inner border border-neutral-200/50 mb-3" />}
                      {comp.status !== 'Resolved' && (
                        <div className="flex gap-2 mt-2">
                           <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(comp.id, 'In Progress'); }} className="flex-1 text-[9px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 py-1.5 rounded-lg transition-colors border border-blue-200 uppercase tracking-wider shadow-sm active:scale-95">
                             In Progress
                           </button>
                           <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(comp.id, 'Resolved'); }} className="flex-1 text-[9px] font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 py-1.5 rounded-lg transition-colors border border-emerald-200 uppercase tracking-wider shadow-sm active:scale-95">
                             Resolve
                           </button>
                        </div>
                      )}
                    </div>
                 </Popup>
               </Marker>
             )
          })}
        </MapContainer>
        
        {/* Floating Live Indicator */}
        <div className="absolute top-8 left-8 z-[400] pointer-events-none">
          <div className="glass px-5 py-2.5 rounded-[1.25rem] border border-white/80 shadow-xl pointer-events-auto flex items-center gap-3">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse delay-75" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse delay-150" />
            </div>
            <span className="text-[11px] font-bold text-neutral-700 uppercase tracking-[0.1em]">Signal Active</span>
          </div>
        </div>

        {/* Floating Action Bar */}
        <div className="absolute bottom-8 left-8 right-8 z-[400] pointer-events-none flex justify-between items-end">
          <button
            onClick={() => setShowAnalytics(true)}
            className="group pointer-events-auto bg-neutral-900/90 backdrop-blur-xl border border-white/10 text-white px-6 py-4 rounded-[1.5rem] shadow-2xl hover:bg-neutral-800 transition-all flex items-center gap-3 active:scale-95"
          >
            <div className="p-2 bg-primary-500 rounded-lg group-hover:rotate-12 transition-transform">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold tracking-tight">Intelligence Dashboard</span>
          </button>
          
          <div className="glass px-4 py-3 rounded-2xl flex items-center gap-6 pointer-events-auto border border-white/50">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
              <span className="text-[10px] font-bold text-neutral-600 uppercase">Optimal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm animate-pulse" />
              <span className="text-[10px] font-bold text-neutral-600 uppercase">Critical</span>
            </div>
          </div>
        </div>

        {/* Analytics Slide-over Panel */}
        <div 
          className={`absolute top-0 right-0 h-full w-full max-w-lg glass-dark border-l border-white/10 shadow-[-20px_0_50px_-10px_rgba(0,0,0,0.3)] z-[500] transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${showAnalytics ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="p-10 flex flex-col h-full overflow-hidden text-white">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-white">Network <span className="text-primary-400">Analysis</span></h2>
                <p className="text-sm text-neutral-400 mt-2 font-medium">Real-time capacity distribution across all units</p>
              </div>
              <button 
                onClick={() => setShowAnalytics(false)}
                className="p-3 hover:bg-white/10 rounded-2xl transition-all text-neutral-400 hover:text-white group"
              >
                <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
              </button>
            </div>
            
            <div className="flex-1 bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-[2.5rem] p-8 flex flex-col shadow-inner">
               <div className="flex justify-between items-center mb-10">
                 <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-widest flex items-center gap-2">
                   <div className="w-2 h-2 bg-primary-500 rounded-full" />
                   Capacity Matrix
                 </h3>
                 <div className="flex gap-2">
                   <div className="px-3 py-1 rounded-full bg-white/5 text-[10px] font-bold text-neutral-400">UNIT LOAD</div>
                 </div>
               </div>

              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bins} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="id" 
                      tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 600}} 
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `ID ${value}`}
                    />
                    <YAxis 
                      tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 600}} 
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.05)', radius: [8, 8, 0, 0]}}
                      contentStyle={{backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)'}}
                      itemStyle={{color: '#fff', fontSize: '12px', fontWeight: '700'}}
                      labelStyle={{color: '#94a3b8', marginBottom: '4px', fontSize: '10px', fontWeight: '800'}}
                      formatter={(value) => [`${value}%`, 'Current Fill']}
                      labelFormatter={(label) => `Bin Terminal #${label}`}
                    />
                    <Bar dataKey="fill_level" radius={[6, 6, 0, 0]} animationDuration={1500}>
                      {
                        bins.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.fill_level > 90 ? '#ef4444' : entry.fill_level > 70 ? '#f59e0b' : 'url(#primaryGradient)'} 
                          />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-10 grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                   <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Average Network Load</p>
                   <p className="text-xl font-bold text-white">
                     {bins.length > 0 ? Math.round(bins.reduce((a, b) => a + b.fill_level, 0) / bins.length) : 0}%
                   </p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                   <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">System Health</p>
                   <p className="text-xl font-bold text-emerald-400">Nominal</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
