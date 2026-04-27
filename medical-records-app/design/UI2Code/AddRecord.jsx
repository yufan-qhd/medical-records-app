import React, { useState } from 'react';

function AddRecord({ records, setRecords, goBack }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    hospital: '',
    department: '',
    diagnosis: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.hospital || !formData.diagnosis) return;
    
    setRecords([
      { id: Date.now(), ...formData },
      ...records
    ]);
    goBack();
  };

  return (
    <div className="h-full bg-white flex flex-col pb-[140px] overflow-y-auto">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">就诊日期</label>
          <input 
            type="date" 
            value={formData.date}
            onChange={e => setFormData({...formData, date: e.target.value})}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">医院名称 *</label>
          <input 
            type="text" 
            value={formData.hospital}
            onChange={e => setFormData({...formData, hospital: e.target.value})}
            placeholder="如：市第一医院"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">科室</label>
          <input 
            type="text" 
            value={formData.department}
            onChange={e => setFormData({...formData, department: e.target.value})}
            placeholder="如：内科"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">诊断结果 *</label>
          <textarea 
            value={formData.diagnosis}
            onChange={e => setFormData({...formData, diagnosis: e.target.value})}
            placeholder="如：上呼吸道感染"
            rows="3"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
            required
          ></textarea>
        </div>
        <button 
          type="submit"
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium py-3 rounded-xl mt-6 shadow-md hover:shadow-lg transition-shadow"
        >
          保存记录
        </button>
      </form>
    </div>
  );
}

export default AddRecord;
