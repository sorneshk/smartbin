import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, Navigation, AlertTriangle, CheckCircle2, Loader2, ImagePlus, Activity, Map as MapIcon, X, Clock } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

// Fix for default marker icon in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function PublicDashboard() {
  const [issueType, setIssueType] = useState('Overflow');
  const [description, setDescription] = useState('');
  const [locationStr, setLocationStr] = useState('');
  const [locationCoords, setLocationCoords] = useState(null);
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Upgrade States
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [myReports, setMyReports] = useState([]);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const fileInputRef = useRef(null);

  const getLocalReportIds = () => {
    try {
      return JSON.parse(localStorage.getItem('my_report_ids') || '[]');
    } catch {
      return [];
    }
  };
  
  const addLocalReportId = (id) => {
    const ids = getLocalReportIds();
    ids.push(id);
    localStorage.setItem('my_report_ids', JSON.stringify(ids));
  };

  useEffect(() => {
    fetchMyReports();

    const channel = supabase
      .channel('my-reports')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'complaints' },
        (payload) => {
          const ids = getLocalReportIds();
          if (ids.includes(payload.new?.id) || ids.includes(payload.old?.id)) {
            fetchMyReports();
            if (payload.eventType === 'UPDATE') {
              toast.success(`One of your reports was updated! Status: ${payload.new.status}`);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMyReports = async () => {
    const ids = getLocalReportIds();
    if (ids.length === 0) {
      setMyReports([]);
      return;
    }
    const { data } = await supabase
      .from('complaints')
      .select('*')
      .in('id', ids)
      .order('id', { ascending: false });
    if (data) setMyReports(data);
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    
    analyzeImage(url);
  };
  
  const analyzeImage = async (url) => {
    setAiAnalyzing(true);
    setAiResult('');
    toast.loading("AI verifying image content...", { id: 'ai' });
    try {
      await tf.ready();
      const model = await cocoSsd.load();
      
      const img = new Image();
      img.src = url;
      img.crossOrigin = "anonymous";
      img.onload = async () => {
        const predictions = await model.detect(img);
        const labels = predictions.map(p => p.class.toLowerCase());
        
        if (predictions.length === 0) {
           setAiResult("Warning: AI found no distinct objects.");
           toast.error("AI Notice: We couldn't identify items clearly. You can still submit.", { id: 'ai' });
        } else {
           const found = labels.join(', ');
           setAiResult(`AI Detected: ${found}`);
           toast.success(`AI Verified Objects: ${found}`, { id: 'ai' });
        }
        setAiAnalyzing(false);
      };
    } catch (err) {
      console.error(err);
      toast.error("AI Analysis failed locally.", { id: 'ai' });
      setAiAnalyzing(false);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setAiResult('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGetLocation = () => {
    setLoadingLoc(true);
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      setLoadingLoc(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationStr(`${position.coords.latitude}, ${position.coords.longitude}`);
        setLocationCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        toast.success('Location obtained');
        setLoadingLoc(false);
      },
      (error) => {
        toast.error('Unable to retrieve your location');
        setLoadingLoc(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!locationStr) {
      toast.error('Please provide a location');
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl = null;
      if (imageFile) {
        toast.loading("Uploading image...", { id: 'submit' });
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('reports')
          .upload(filePath, imageFile);

        if (uploadError) {
            console.error("Storage upload error:", uploadError);
            toast.error("Image upload failed, submitting without image.", { id: 'submit' });
        } else {
            const { data: publicUrlData } = supabase.storage
              .from('reports')
              .getPublicUrl(filePath);

            imageUrl = publicUrlData.publicUrl;
        }
      }
      
      toast.loading("Saving report...", { id: 'submit' });
      const { error, data } = await supabase.from('complaints').insert([
        {
          type: issueType,
          description,
          location: locationStr,
          image_url: imageUrl,
          status: 'Pending'
        }
      ]).select();

      if (error) throw error;
      if (data && data.length > 0) {
        addLocalReportId(data[0].id);
      }
      
      toast.success('Complaint submitted successfully!', { id: 'submit' });
      setDescription('');
      setLocationStr('');
      setLocationCoords(null);
      setIssueType('Overflow');
      removeImage();
      fetchMyReports();
    } catch (err) {
      toast.error(`Error submitting complaint: ${err.message}`, { id: 'submit' });
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen mesh-gradient p-6 font-sans relative overflow-hidden flex justify-center">
      <div className="absolute top-[-5%] right-[-5%] w-[30%] h-[30%] rounded-full bg-primary-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] rounded-full bg-secondary-500/5 blur-[100px] pointer-events-none" />
      
      <Toaster position="top-center" />
      
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 my-8">
        
        {/* Form Column */}
        <div className="lg:col-span-8 glass rounded-[3rem] shadow-2xl border border-white/60 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-br from-primary-600 to-indigo-700 p-10 text-white relative shrink-0">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <AlertTriangle className="w-32 h-32 rotate-12" />
            </div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/30">
                <AlertTriangle className="text-white w-7 h-7" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight">Citizen <span className="opacity-80">Report</span></h2>
              <p className="text-primary-100/80 mt-3 text-sm font-medium leading-relaxed max-w-sm">
                Help us keep the city clean. Use AI-assisted reporting to instantly notify the Command Center.
              </p>
            </div>
          </div>

          <div className="p-10 bg-white/40 flex-1">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label className="block text-sm font-bold text-neutral-700 mb-2 ml-1">Issue Category</label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-5 py-4 text-sm font-medium focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none appearance-none cursor-pointer group-hover:border-neutral-300"
                  >
                    <option value="Overflow">Overflowing Bin</option>
                    <option value="Damage">Structural Damage</option>
                    <option value="Smell">Pungent Odor</option>
                    <option value="Other">Other Issues</option>
                  </select>
                </div>

                <div className="group">
                  <label className="block text-sm font-bold text-neutral-700 mb-2 ml-1">Pinpoint Location</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        readOnly
                        placeholder="GPS Coordinates"
                        value={locationStr}
                        className="w-full rounded-2xl border border-neutral-200 bg-neutral-100/50 px-5 py-4 text-sm font-mono text-neutral-500 outline-none cursor-default group-hover:border-neutral-300"
                      />
                      <MapPin className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    </div>
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={loadingLoc}
                      className="shrink-0 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl px-5 flex items-center justify-center transition-all shadow-lg active:scale-95 disabled:opacity-50 group/loc"
                    >
                      {loadingLoc ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5 group-hover/loc:rotate-45 transition-transform" />}
                    </button>
                  </div>
                </div>
              </div>

              {locationCoords && (
                 <div className="h-[200px] w-full rounded-2xl overflow-hidden border border-neutral-200 shadow-inner mt-4 animate-in fade-in duration-500">
                    <MapContainer center={[locationCoords.lat, locationCoords.lng]} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={[locationCoords.lat, locationCoords.lng]} />
                    </MapContainer>
                 </div>
              )}

              <div className="group">
                <label className="block text-sm font-bold text-neutral-700 mb-2 ml-1">Image Evidence (Optional)</label>
                <div className={`relative w-full rounded-2xl border-2 border-dashed ${imagePreview ? 'border-primary-400 bg-primary-50/50' : 'border-neutral-300 bg-white/50'} p-6 transition-all hover:border-primary-400 flex flex-col items-center justify-center min-h-[160px]`}>
                  {!imagePreview ? (
                     <div className="text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                       <ImagePlus className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
                       <p className="text-sm font-bold text-neutral-600">Click to upload photo</p>
                       <p className="text-xs text-neutral-500 mt-1">AI contents validation enabled</p>
                     </div>
                  ) : (
                     <div className="relative w-full flex gap-6 items-center">
                        <img src={imagePreview} className="h-32 w-32 object-cover rounded-xl shadow-md border border-neutral-200" alt="Preview"/>
                        <div className="flex-1">
                          <h4 className="font-bold text-neutral-800 text-sm mb-1 line-clamp-1">{imageFile?.name}</h4>
                          {aiAnalyzing ? (
                             <p className="text-xs font-semibold text-primary-600 flex items-center gap-1 animate-pulse">
                               <Loader2 className="w-3 h-3 animate-spin"/> Running AI detection...
                             </p>
                          ) : (
                             <p className={`text-xs font-bold ${aiResult.includes('Warning') ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {aiResult}
                             </p>
                          )}
                        </div>
                        <button type="button" onClick={removeImage} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors">
                           <X className="w-5 h-5"/>
                        </button>
                     </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
                </div>
              </div>

              <div className="group">
                <label className="block text-sm font-bold text-neutral-700 mb-2 ml-1">Situation Details</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe the issue in detail..."
                  className="w-full rounded-2xl border border-neutral-200 bg-white/80 px-5 py-4 text-sm font-medium focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none resize-none group-hover:border-neutral-300"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-2xl py-5 px-6 flex justify-center items-center transition-all duration-300 shadow-xl shadow-primary-500/20 active:scale-[0.98] group"
                >
                  {submitting ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                      Broadcast Report to Command Center
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Real-time Status Feed Column */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          <div className="glass rounded-[3rem] p-8 border border-white/60 shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-8">
               <div>
                  <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                     <Activity className="w-5 h-5 text-primary-500" />
                     My Reports
                  </h3>
                  <p className="text-xs text-neutral-500 font-medium mt-1">Live updates from City Command</p>
               </div>
               <div className="relative flex h-3 w-3">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
               {myReports.length === 0 ? (
                  <div className="text-center px-4 py-10">
                     <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4 border border-neutral-200">
                        <Clock className="w-6 h-6 text-neutral-400" />
                     </div>
                     <p className="text-sm font-bold text-neutral-600">No recent reports</p>
                     <p className="text-xs text-neutral-400 mt-1">Complaints you submit will appear here</p>
                  </div>
               ) : (
                  myReports.map(report => (
                     <div key={report.id} className="p-5 rounded-2xl bg-white/60 border border-neutral-200/50 hover:border-primary-300 hover:shadow-md transition-all group">
                         <div className="flex justify-between items-start mb-3">
                             <div className="font-bold text-sm text-neutral-800">{report.type}</div>
                             <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${
                                report.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' :
                                report.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                'bg-amber-100 text-amber-700'
                             }`}>
                                {report.status || 'Pending'}
                             </span>
                         </div>
                         <p className="text-xs text-neutral-500 line-clamp-2 mb-3">{report.description}</p>
                         {report.image_url && (
                             <img src={report.image_url} alt="Evidence" className="w-full h-24 object-cover rounded-xl mb-3 border border-neutral-200"/>
                         )}
                         <div className="text-[10px] text-neutral-400 font-bold flex items-center gap-1 mt-auto">
                            <Clock className="w-3 h-3" />
                            {new Date(report.created_at).toLocaleDateString()}
                         </div>
                     </div>
                  ))
               )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
