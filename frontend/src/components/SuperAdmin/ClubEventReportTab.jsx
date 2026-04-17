import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Download, Send, Plus, Trash2, 
  Info, CheckCircle, AlertCircle, Calendar,
  MapPin, Target, Award, Users, Mic2
} from 'lucide-react';
import { api } from '../../store/authStore';
import { API } from './constants';
import toast from 'react-hot-toast';

const ClubEventReportTab = () => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        eventTitle: '',
        clubName: 'Code Circle Club',
        category: 'Workshop',
        academicYear: '2023-24',
        date: '',
        venue: '',
        objective: '',
        outcome: '',
        resourcePerson: '',
        summaryOverview: '',
        summaryStrategies: '',
        summaryActivities: '',
        summaryAccomplishments: '',
        summaryAchievements: '',
        summaryTakeaways: '',
        attendance: [{ name: '' }],
        feedback: [{ name: '', comment: '' }],
        brochure: '',
        circular: '',
        photo1: '',
        photo1Caption: '',
        photo2: '',
        photo2Caption: ''
    });

    const handleImageUpload = (e) => {
        const { name, files } = e.target;
        if (files && files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setFormData(prev => ({ ...prev, [name]: event.target.result }));
            };
            reader.readAsDataURL(files[0]);
        }
    };

    const categories = [
        'Workshop', 'Seminar', 'Outreach', 'Competition', 'Mini Hackathon', 'Guest Lecture', 'Other'
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleArrayChange = (index, arrayName, field, value) => {
        const newArray = [...formData[arrayName]];
        newArray[index] = field ? { ...newArray[index], [field]: value } : { name: value };
        setFormData(prev => ({ ...prev, [arrayName]: newArray }));
    };

    const addArrayItem = (arrayName) => {
        const newItem = arrayName === 'attendance' ? { name: '' } : { name: '', comment: '' };
        setFormData(prev => ({ ...prev, [arrayName]: [...prev[arrayName], newItem] }));
    };

    const removeArrayItem = (index, arrayName) => {
        const newArray = formData[arrayName].filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, [arrayName]: newArray }));
    };

    const handleGenerateReport = async () => {
        if (!formData.eventTitle) {
            toast.error("Event Title is required");
            return;
        }

        setLoading(true);
        try {
            const response = await api.post(`${API}/club-event-report`, formData, {
                responseType: 'blob'
            });

            // Create a link to download the PDF
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Event_Report_${formData.eventTitle.replace(/\s+/g, '_')}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Report generated successfully!");
        } catch (error) {
            console.error("Report generation failed:", error);
            toast.error("Failed to generate report");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-linear-to-r from-indigo-600 to-violet-600 p-8 rounded-3xl text-white shadow-xl">
                <div>
                    <h1 className="text-3xl font-black tracking-tight mb-2">Club Event Report</h1>
                    <p className="text-indigo-100 font-medium opacity-90 max-w-lg">
                        Generate official BIT Code Circle Club event documentation with precision and professional alignment.
                    </p>
                </div>
                <button
                    onClick={handleGenerateReport}
                    disabled={loading}
                    className="flex items-center gap-3 px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50 shadow-2xl shadow-indigo-900/20"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Download size={20} strokeWidth={3} />
                    )}
                    Generate PDF
                </button>
            </div>

            {/* Form Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* 1. Primary Details */}
                <section className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Info size={18} />
                        </div>
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">Primary Details</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Event Title</label>
                            <input 
                                name="eventTitle"
                                value={formData.eventTitle}
                                onChange={handleInputChange}
                                placeholder="e.g. Master the Code: React Workshop"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-hidden transition-all text-slate-700 font-medium placeholder:text-slate-300"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Category</label>
                                <select 
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-hidden transition-all text-slate-700 font-medium"
                                >
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Date</label>
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input 
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleInputChange}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-hidden transition-all text-slate-700 font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Academic Year</label>
                                <input 
                                    name="academicYear"
                                    value={formData.academicYear}
                                    onChange={handleInputChange}
                                    placeholder="2023-24"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-hidden transition-all text-slate-700 font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Venue</label>
                                <div className="relative">
                                    <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input 
                                        name="venue"
                                        value={formData.venue}
                                        onChange={handleInputChange}
                                        placeholder="e.g. SF Block Auditorium"
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-hidden transition-all text-slate-700 font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. Objectives & Outcomes */}
                <section className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                            <Target size={18} />
                        </div>
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">Mission Statement</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Event Objectives</label>
                            <textarea 
                                name="objective"
                                value={formData.objective}
                                onChange={handleInputChange}
                                rows={3}
                                placeholder="State specific, measurable, attainable goals..."
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-hidden transition-all text-slate-700 font-medium resize-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Expected Outcomes</label>
                            <textarea 
                                name="outcome"
                                value={formData.outcome}
                                onChange={handleInputChange}
                                rows={3}
                                placeholder="What should participants achieve?"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-hidden transition-all text-slate-700 font-medium resize-none"
                            />
                        </div>
                    </div>
                </section>

                {/* 3. Event Summary */}
                <section className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm space-y-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                            <FileText size={18} />
                        </div>
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">Event Summary</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Event Overview</label>
                            <textarea 
                                name="summaryOverview"
                                value={formData.summaryOverview}
                                onChange={handleInputChange}
                                rows={4}
                                placeholder="Purpose, Guest of Honor, etc."
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-hidden transition-all text-slate-700 font-medium resize-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Strategies Used</label>
                            <textarea 
                                name="summaryStrategies"
                                value={formData.summaryStrategies}
                                onChange={handleInputChange}
                                rows={4}
                                placeholder="Methodologies, teaching tools..."
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-hidden transition-all text-slate-700 font-medium resize-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Activities Conducted</label>
                            <textarea 
                                name="summaryActivities"
                                value={formData.summaryActivities}
                                onChange={handleInputChange}
                                rows={3}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-hidden transition-all text-slate-700 font-medium resize-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Takeaways</label>
                            <textarea 
                                name="summaryTakeaways"
                                value={formData.summaryTakeaways}
                                onChange={handleInputChange}
                                rows={3}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-hidden transition-all text-slate-700 font-medium resize-none"
                            />
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-8 mt-2">
                       <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Resource Person Details</label>
                       <div className="relative">
                           <Mic2 size={16} className="absolute left-4 top-4 text-slate-300" />
                           <textarea 
                                name="resourcePerson"
                                value={formData.resourcePerson}
                                onChange={handleInputChange}
                                rows={3}
                                placeholder="Biographical sketch and expertise..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-hidden transition-all text-slate-700 font-medium resize-none"
                            />
                       </div>
                    </div>
                </section>

                {/* 4. Media & Proofs */}
                <section className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm space-y-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-violet-50 text-violet-600 rounded-xl">
                            <Plus size={18} />
                        </div>
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">Media & Proofs</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { id: 'brochure', label: 'Event Brochure*' },
                            { id: 'circular', label: 'Event Circular*' },
                            { id: 'photo1', label: 'Geo-Photo 1' },
                            { id: 'photo2', label: 'Geo-Photo 2' }
                        ].map(item => (
                            <div key={item.id} className="space-y-3">
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{item.label}</label>
                                <div className="relative group aspect-square rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 overflow-hidden flex flex-col items-center justify-center bg-slate-50 transition-all">
                                    {formData[item.id] ? (
                                        <>
                                            <img src={formData[item.id]} className="w-full h-full object-cover" alt={item.label} />
                                            <button 
                                                onClick={() => setFormData(prev => ({ ...prev, [item.id]: '' }))}
                                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={24} className="text-slate-300 mb-2 group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] font-bold text-slate-400">Select Image</span>
                                        </>
                                    )}
                                    <input 
                                        type="file" 
                                        name={item.id}
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                </div>
                                {item.id.startsWith('photo') && (
                                    <input 
                                        name={`${item.id}Caption`}
                                        value={formData[`${item.id}Caption`]}
                                        onChange={handleInputChange}
                                        placeholder="Add caption..."
                                        className="w-full px-3 py-1.5 bg-slate-100/50 border border-slate-100 rounded-lg text-[10px] font-medium outline-hidden"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* 5. Dynamic Sections (Attendance & Feedback) */}
                <section className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm space-y-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Users size={18} />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">Attendance</h2>
                        </div>
                        <button 
                            type="button" 
                            onClick={() => addArrayItem('attendance')}
                            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                        >
                            <Plus size={16} strokeWidth={3} />
                        </button>
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {formData.attendance.map((item, index) => (
                            <motion.div 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                key={index} 
                                className="flex gap-2"
                            >
                                <input 
                                    value={item.name}
                                    onChange={(e) => handleArrayChange(index, 'attendance', null, e.target.value)}
                                    placeholder="Participant Name"
                                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:border-indigo-500 outline-hidden transition-all text-sm font-medium"
                                />
                                {formData.attendance.length > 1 && (
                                    <button 
                                        onClick={() => removeArrayItem(index, 'attendance')}
                                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </section>

                <section className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm space-y-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                                <Award size={18} />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">Feedback</h2>
                        </div>
                        <button 
                            type="button" 
                            onClick={() => addArrayItem('feedback')}
                            className="p-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200"
                        >
                            <Plus size={16} strokeWidth={3} />
                        </button>
                    </div>

                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {formData.feedback.map((item, index) => (
                            <motion.div 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                key={index} 
                                className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 relative group"
                            >
                                <div className="flex gap-2">
                                    <input 
                                        value={item.name}
                                        onChange={(e) => handleArrayChange(index, 'feedback', 'name', e.target.value)}
                                        placeholder="Participant Name"
                                        className="flex-1 px-4 py-2 bg-white border border-slate-100 rounded-xl focus:border-rose-500 outline-hidden transition-all text-sm font-bold"
                                    />
                                    {formData.feedback.length > 1 && (
                                        <button 
                                            onClick={() => removeArrayItem(index, 'feedback')}
                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                                <textarea 
                                    value={item.comment}
                                    onChange={(e) => handleArrayChange(index, 'feedback', 'comment', e.target.value)}
                                    placeholder="Feedback/Satisfaction Summary"
                                    className="w-full px-4 py-2 bg-white border border-slate-100 rounded-xl focus:border-rose-500 outline-hidden transition-all text-sm font-medium resize-none"
                                    rows={2}
                                />
                            </motion.div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default ClubEventReportTab;
