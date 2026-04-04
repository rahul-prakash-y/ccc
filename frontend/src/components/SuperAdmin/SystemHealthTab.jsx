import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Server, Activity, Database, Zap, X } from 'lucide-react';
import { api } from '../../store/authStore';
import { API } from './constants';
import { toast } from 'react-hot-toast';

const SystemHealthTab = () => {
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSyncServers = async () => {
    setSyncing(true);
    setSyncResults(null);
    setShowConfirm(false);
    try {
      const res = await api.post(`${API}/sync-servers`);
      setSyncResults(res.data.results);
      toast.success('Sync broadcast complete');
    } catch (err) {
      console.error(err);
      toast.error('Failed to broadcast sync');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 1. Header Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Server size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cluster Size</p>
            <p className="text-xl font-bold text-slate-800">8 Virtual Nodes</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Status</p>
            <p className="text-xl font-bold text-slate-800">Operational</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Database size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RAM Cache</p>
            <p className="text-xl font-bold text-slate-800">Hydrated</p>
          </div>
        </div>
      </div>

      {/* 2. Control Panel */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-lg">
                    <Zap size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900">Cluster Cache Management</h3>
                    <p className="text-xs text-slate-500 font-medium tracking-tight">Force RAM re-hydration across all student instances</p>
                </div>
            </div>

            <button
                onClick={() => setShowConfirm(true)}
                disabled={syncing}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95 ${
                    syncing ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
                }`}
            >
                {syncing ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                Sync All Cluster Nodes
            </button>
        </div>

        <div className="p-6">
            {!syncResults ? (
                <div className="py-12 flex flex-col items-center justify-center text-center opacity-60">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <ShieldCheck size={32} className="text-slate-300" />
                    </div>
                    <h4 className="font-bold text-slate-800">System Ready for Sync</h4>
                    <p className="max-w-xs text-xs text-slate-500 mt-1">Use the button above to broadcast a cache refresh signal. This ensures all student backends are serving current data.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Broadcast Report</h4>
                        <span className="px-2 py-1 bg-slate-100 rounded text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Cluster Protocol v1.0</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        {syncResults.map((res, i) => (
                            <div key={i} className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all hover:translate-x-1 ${
                                res.status === 'success' ? 'bg-emerald-50/30 border-emerald-100/50' : 'bg-red-50/30 border-red-100/50'
                            }`}>
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className={`p-2 rounded-lg shrink-0 ${res.status === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                        <Server size={14} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Node {i + 1}</p>
                                        <p className="text-xs font-bold text-slate-800 truncate">{res.url}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="text-right hidden sm:block">
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${res.status === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {res.status.toUpperCase()}
                                        </p>
                                        <p className="text-[10px] text-slate-500 font-medium truncate max-w-[200px]">
                                            {res.status === 'success' ? res.message : res.error}
                                        </p>
                                    </div>

                                    {res.status === 'success' ? (
                                        <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-100/50 flex items-center justify-center text-emerald-600">
                                            <CheckCircle2 size={16} />
                                        </div>
                                    ) : (
                                        <div className="shrink-0 w-8 h-8 rounded-full bg-red-100/50 flex items-center justify-center text-red-500">
                                            <AlertTriangle size={16} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-12">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Initialize Cluster Sync?</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">This will send a high-priority signal to all student backend instances to flush and re-hydrate their RAM caches. This may cause a micro-latency spike for active users.</p>
                </div>
                <div className="p-6 bg-slate-50 flex gap-3">
                    <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 bg-white hover:bg-slate-100 text-slate-600 font-bold rounded-xl border border-slate-200 transition-all">
                        Cancel
                    </button>
                    <button onClick={handleSyncServers} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-95">
                        Confirm Sync
                    </button>
                </div>
            </motion.div>
        </div>
      )}
    </div>
  );
};

export default SystemHealthTab;
