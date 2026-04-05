import React, { useState, useEffect } from 'react';
import { 
  Database, Table, Search, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, 
  RefreshCw, AlertCircle, CheckCircle2, XCircle, Download, Upload, Filter
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const DynamicFormField = ({ label, value, onChange, path }) => {
  const type = typeof value;
  
  if (type === 'boolean') {
    return (
      <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{label}</span>
        <button 
          onClick={() => onChange(path, !value)}
          className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${value ? 'bg-indigo-600' : 'bg-slate-300'}`}
        >
          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${value ? 'translate-x-[18px]' : 'translate-x-1'}`} />
        </button>
      </div>
    );
  }

  if (type === 'object' && value !== null && !Array.isArray(value)) {
    return (
      <div className="space-y-4 p-4 border border-slate-100 rounded-2xl bg-white shadow-xs">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 border-b border-indigo-50 pb-2">{label}</h4>
        <div className="grid grid-cols-1 gap-4">
          {Object.entries(value).map(([key, val]) => (
            <DynamicFormField 
              key={key} 
              label={key} 
              value={val} 
              onChange={onChange} 
              path={[...path, key]} 
            />
          ))}
        </div>
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div className="space-y-4 p-4 border border-slate-100 rounded-2xl bg-slate-50/30">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label} (Array)</h4>
           <button 
             onClick={() => onChange(path, [...value, ""])}
             className="p-1 bg-white text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-100 transition-all shadow-xs"
           >
             <Plus size={12} />
           </button>
        </div>
        <div className="space-y-3">
          {value.map((val, index) => (
            <div key={index} className="flex gap-2 items-start">
              <div className="flex-1">
                <DynamicFormField 
                  label={`${label}[${index}]`} 
                  value={val} 
                  onChange={onChange} 
                  path={[...path, index]} 
                />
              </div>
              <button 
                onClick={() => {
                  const newArr = [...value];
                  newArr.splice(index, 1);
                  onChange(path, newArr);
                }}
                className="mt-6 p-2 text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {value.length === 0 && (
            <p className="text-[10px] text-slate-400 italic text-center py-2">Empty array</p>
          )}
        </div>
      </div>
    );
  }

  const isDate = type === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">{label}</label>
      <input
        type={isDate ? 'datetime-local' : (type === 'number' ? 'number' : 'text')}
        value={isDate ? value.substring(0, 16) : (value || '')}
        disabled={label === '_id' || label === 'createdAt' || label === 'updatedAt'}
        onChange={(e) => onChange(path, type === 'number' ? Number(e.target.value) : e.target.value)}
        className={`w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700 ${
          (label === '_id' || label === 'createdAt' || label === 'updatedAt') ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''
        }`}
      />
    </div>
  );
};


const DatabaseManagerTab = () => {
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDoc, setCurrentDoc] = useState(null);
  const [jsonInput, setJsonInput] = useState('');
  const [viewMode, setViewMode] = useState('form'); // 'form' or 'json'
  const [formData, setFormData] = useState({});

  const token = localStorage.getItem('token');
  const API_BASE = '/api/database';
  
  const fetchCollections = React.useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/collections`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        setCollections(data.collections);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch collections');
    }
  }, [token]);

  const fetchDocuments = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/${selectedCollection}`, {
        params: { page, limit, search },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        setDocuments(data.documents);
        setTotal(data.total);
      }
    } catch (err) {
      console.error(err);
      toast.error(`Failed to fetch documents from ${selectedCollection}`);
    } finally {
      setLoading(false);
    }
  }, [selectedCollection, page, limit, search, token]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  useEffect(() => {
    if (selectedCollection) {
      fetchDocuments();
    }
  }, [selectedCollection, page, search, fetchDocuments]);


  const handleSave = async () => {
    try {
      let payload;
      if (viewMode === 'json') {
        payload = JSON.parse(jsonInput);
      } else {
        payload = formData;
      }

      if (currentDoc) {
        // Compute diff to send only changed fields
        const diff = {};
        Object.keys(payload).forEach(key => {
          if (key === '_id' || key === 'createdAt' || key === 'updatedAt' || key === '__v') return;
          
          const original = JSON.stringify(currentDoc[key]);
          const updated = JSON.stringify(payload[key]);
          
          if (original !== updated) {
            diff[key] = payload[key];
          }
        });

        if (Object.keys(diff).length === 0) {
          toast.info('No changes detected');
          setIsModalOpen(false);
          return;
        }

        await axios.patch(`${API_BASE}/${selectedCollection}/${currentDoc._id}`, diff, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Document updated successfully');
      } else {
        await axios.post(`${API_BASE}/${selectedCollection}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Document created successfully');
      }
      setIsModalOpen(false);
      fetchDocuments();
    } catch (error) {
      toast.error(error.message || 'Failed to save document');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await axios.delete(`${API_BASE}/${selectedCollection}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Document deleted successfully');
      fetchDocuments();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete document');
    }
  };

  const openModal = (doc = null) => {
    // If it's a new document, try to infer the schema from an existing document
    const initialDoc = doc || (documents.length > 0 ? Object.keys(documents[0]).reduce((acc, key) => {
       if (key === '_id' || key === '__v' || key === 'createdAt' || key === 'updatedAt') return acc;
       const val = documents[0][key];
       acc[key] = (typeof val === 'boolean') ? false : (typeof val === 'number' ? 0 : (Array.isArray(val) ? [] : (typeof val === 'object' && val !== null ? {} : "")));
       return acc;
    }, {}) : {});

    setCurrentDoc(doc);
    setFormData(doc ? JSON.parse(JSON.stringify(doc)) : initialDoc);
    setJsonInput(doc ? JSON.stringify(doc, null, 2) : JSON.stringify(initialDoc, null, 2));
    setIsModalOpen(true);
  };

  const handleFormChange = (path, value) => {
    setFormData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      let current = newData;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      setJsonInput(JSON.stringify(newData, null, 2));
      return newData;
    });
  };

  const addField = () => {
    const key = window.prompt('Enter field name:');
    if (key && !formData[key]) {
      const newData = { ...formData, [key]: "" };
      setFormData(newData);
      setJsonInput(JSON.stringify(newData, null, 2));
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
            <Database size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Database Manager</h1>
            <p className="text-sm text-slate-500">Visual CRUD interface for all collections</p>
          </div>
        </div>
        <button 
          onClick={fetchCollections}
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Collections Sidebar */}
        <div className="w-64 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-white">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Table size={14} /> Collections
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {collections.map(col => (
              <button
                key={col}
                onClick={() => { setSelectedCollection(col); setPage(1); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedCollection === col 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{col}</span>
                {selectedCollection === col && <ChevronRight size={14} />}
              </button>
            ))}
          </div>
        </div>

        {/* Documents Content */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {!selectedCollection ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4">
              <div className="p-4 bg-slate-50 rounded-full border border-slate-100">
                <Database size={48} className="opacity-20" />
              </div>
              <p className="font-medium">Select a collection to view documents</p>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search by ID or Name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-95"
                  >
                    <Plus size={16} /> Add Document
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-50 z-10">
                    <tr>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">ID</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Details (JSON Snippet)</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc._id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <code className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                            {doc._id}
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-md truncate text-xs font-mono text-slate-500">
                            {JSON.stringify(doc).substring(0, 100)}...
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => openModal(doc)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(doc._id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {documents.length === 0 && !loading && (
                      <tr>
                        <td colSpan="3" className="px-6 py-12 text-center text-slate-400 italic">
                          No documents found in this collection
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {documents.length} of {total} documents
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold text-slate-700 px-3">Page {page}</span>
                  <button
                    disabled={page * limit >= total}
                    onClick={() => setPage(p => p + 1)}
                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {currentDoc ? 'Edit Document' : 'New Document'}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                    Collection: {selectedCollection}
                  </p>
                  <span className="text-slate-300">•</span>
                  <div className="flex p-0.5 bg-slate-200 rounded-lg">
                    <button 
                      onClick={() => setViewMode('form')}
                      className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${viewMode === 'form' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Form View
                    </button>
                    <button 
                      onClick={() => setViewMode('json')}
                      className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${viewMode === 'json' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      JSON Editor
                    </button>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {viewMode === 'json' ? (
                <div className="space-y-2 h-full flex flex-col">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                    Document JSON
                  </label>
                  <div className="relative group flex-1">
                    <textarea
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      className="w-full h-full min-h-[400px] p-4 font-mono text-sm bg-slate-900 text-emerald-400 rounded-2xl border-2 border-slate-800 focus:border-indigo-500/50 focus:outline-none transition-all resize-none shadow-inner"
                      placeholder='{ "key": "value" }'
                    />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="px-2 py-1 bg-slate-800 text-[10px] text-slate-400 rounded font-mono">JSON</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 pb-4">
                  {Object.entries(formData).map(([key, val]) => (
                    <DynamicFormField 
                      key={key} 
                      label={key} 
                      value={val} 
                      onChange={handleFormChange} 
                      path={[key]} 
                    />
                  ))}
                  <button 
                    onClick={addField}
                    className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest"
                  >
                    <Plus size={16} /> Add New Field
                  </button>
                  {Object.keys(formData).length === 0 && (
                    <p className="text-center text-slate-400 py-4 italic">No fields to display</p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 shrink-0">
                <AlertCircle className="text-indigo-500 shrink-0" size={18} />
                <p className="text-[11px] text-indigo-700 font-medium leading-relaxed">
                  Careful: You are editing the database directly. Ensure your changes are valid for the collection's structure.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 text-sm font-bold text-slate-500 hover:bg-slate-200/50 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-8 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
              >
                Save Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseManagerTab;
