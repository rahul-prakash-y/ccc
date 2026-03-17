import React, { useState, useEffect } from 'react';
import { 
    Award, Upload, Download, Loader2, CheckCircle2, 
    AlertCircle, FileText, Image as ImageIcon, Users
} from 'lucide-react';
import { api } from '../../store/authStore';
import { useRoundStore } from '../../store/roundStore';
import { API } from './constants';
import toast from 'react-hot-toast';

const CertificateManager = () => {
    const { rounds, fetchRounds } = useRoundStore();
    const [selectedRound, setSelectedRound] = useState('');
    const [winnerLimit, setWinnerLimit] = useState(10);
    const [uploading, setUploading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loadingTemplate, setLoadingTemplate] = useState(true);

    useEffect(() => {
        fetchRounds();
        fetchTemplatePreview();
    }, [fetchRounds]);

    const fetchTemplatePreview = async () => {
        setLoadingTemplate(true);
        try {
            const res = await api.get(`${API}/certificates/template`, { responseType: 'blob' });
            if (res.data) {
                const url = URL.createObjectURL(res.data);
                setPreviewUrl(url);
            }
        } catch (err) {
            console.error('Failed to fetch template preview:', err);
            setPreviewUrl(null);
        } finally {
            setLoadingTemplate(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file (JPG/PNG)');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            await api.post(`${API}/certificates/template`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Certificate template updated!');
            fetchTemplatePreview();
        } catch (err) {
            console.error('Upload failed:', err);
            toast.error('Failed to upload template');
        } finally {
            setUploading(false);
        }
    };

    const handleGenerate = async () => {
        if (!selectedRound) {
            toast.error('Please select a round first');
            return;
        }

        setGenerating(true);
        try {
            const res = await api.get(`${API}/certificates/generate`, {
                params: { roundId: selectedRound, limit: winnerLimit },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            
            const roundName = rounds.find(r => r._id === selectedRound)?.name || 'certificates';
            link.setAttribute('download', `${roundName.replace(/\s+/g, '_')}_certificates.zip`);
            
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            toast.success('Certificates generated successfully!');
        } catch (err) {
            console.error('Generation failed:', err);
            const message = err.response?.data?.error || 'Failed to generate certificates';
            toast.error(message);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header Area */}
            <div className="bg-linear-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-100">
                        <Award size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Bulk Certificate Generator</h2>
                        <p className="text-sm text-emerald-600 font-medium">Generate personalized winner certificates in bulk</p>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Step 1: Template Upload */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <ImageIcon size={16} className="text-indigo-500" />
                            1. Certificate Template
                        </h3>
                        {previewUrl && <CheckCircle2 size={16} className="text-emerald-500" />}
                    </div>
                    
                    <div className="p-6">
                        <div className="relative group aspect-[1.414/1] bg-slate-100 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden">
                            {loadingTemplate ? (
                                <Loader2 className="animate-spin text-slate-300" size={32} />
                            ) : previewUrl ? (
                                <>
                                    <img src={previewUrl} alt="Template" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <label className="cursor-pointer bg-white text-slate-800 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 active:scale-95 transition-all">
                                            <Upload size={16} /> 
                                            Change Template
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                                        </label>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center p-8">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-400 mx-auto mb-3 shadow-sm">
                                        <Upload size={20} />
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Upload JPG or PNG</p>
                                    <label className="cursor-pointer bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-bold inline-block hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-100">
                                        Select Template
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                                    </label>
                                </div>
                            )}
                            
                            {uploading && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                    <div className="text-center">
                                        <Loader2 className="animate-spin text-indigo-600 mx-auto mb-2" size={24} />
                                        <p className="text-xs font-bold text-slate-600 animate-pulse">Uploading...</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <p className="mt-4 text-[11px] text-slate-400 italic">
                            Tip: Use a landscape image (like 1414x1000px) with plenty of space in the middle for the student's name.
                        </p>
                    </div>
                </div>

                {/* Step 2: Generation Settings */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FileText size={16} className="text-indigo-500" />
                            2. Generation Settings
                        </h3>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Round Selection */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Select Competition Round</label>
                            <div className="relative">
                                <select 
                                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-10 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none transition-all"
                                    value={selectedRound}
                                    onChange={(e) => setSelectedRound(e.target.value)}
                                >
                                    <option value="">Select a round...</option>
                                    {rounds.map(r => (
                                        <option key={r._id} value={r._id}>{r.name} ({r.status})</option>
                                    ))}
                                </select>
                                <Users size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>

                        {/* Top N Winners */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Top Winners Count</label>
                            <input 
                                type="number" 
                                min="1" 
                                max="1000"
                                className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-black text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                                value={winnerLimit}
                                onChange={(e) => setWinnerLimit(e.target.value)}
                            />
                            <p className="text-[10px] text-slate-400 font-medium">Generate certificates for the top {winnerLimit} scorers in this round.</p>
                        </div>

                        {/* Summary / Warning */}
                        {!previewUrl && (
                            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex gap-3 text-amber-700">
                                <AlertCircle size={18} className="shrink-0" />
                                <p className="text-xs font-medium leading-relaxed">
                                    You need to upload a background template (Step 1) before you can generate certificates.
                                </p>
                            </div>
                        )}

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={generating || !selectedRound || !previewUrl}
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl flex items-center justify-center gap-3 font-black text-sm tracking-wider shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                        >
                            {generating ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    PROCESSING...
                                </>
                            ) : (
                                <>
                                    <Download size={20} />
                                    GENERATE & DOWNLOAD ZIP
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CertificateManager;
