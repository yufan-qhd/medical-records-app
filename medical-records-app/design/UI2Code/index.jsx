import React, { useState, useEffect } from 'react';
import Home from './Home';
import Records from './Records';
import Statistics from './Statistics';
import Drawer from './Drawer';
import VoiceButton from './VoiceButton';
import RecordDetail from './RecordDetail';
import Login from './Login';

function App() {
  const [currentPage, setCurrentPage] = useState('index');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [records, setRecords] = useState([
    { 
      id: 1, 
      date: '2026-04-01', 
      hospital: '市第一人民医院', 
      department: '呼吸内科', 
      doctor: '张医生', 
      complaint: '咳嗽、发热3天，伴有轻微喉咙痛',
      diagnosis: '上呼吸道感染',
      images: [
        { url: 'https://l-api.jd.com/relay-aigc/design/image/prompt/A%20clear%20medical%20chest%20x-ray%20film?width=512&height=512', label: '胸部X光片' },
        { url: 'https://l-api.jd.com/relay-aigc/design/image/prompt/A%20printed%20hospital%20prescription%20paper%20with%20stamps?width=512&height=512', label: '电子处方单' }
      ]
    },
    { 
      id: 2, 
      date: '2025-11-15', 
      hospital: '区中心医院', 
      department: '消化内科', 
      doctor: '李主任', 
      complaint: '腹痛腹泻1天，疑似吃了不洁食物',
      diagnosis: '急性胃肠炎',
      images: [
        { url: 'https://l-api.jd.com/relay-aigc/design/image/prompt/A%20medical%20blood%20test%20report%20paper?width=512&height=512', label: '血常规化验单' }
      ]
    },
    { 
      id: 3, 
      date: '2025-09-10', 
      hospital: '市第一人民医院', 
      department: '耳鼻喉科', 
      doctor: '王医生', 
      complaint: '频繁打喷嚏、流清涕，早晨严重',
      diagnosis: '过敏性鼻炎',
      images: []
    }
  ]);

  useEffect(() => {
    const handlePageChange = () => {
      const pageKey = document.querySelector('[data-page-key]')?.getAttribute('data-page-key');
      if (pageKey && pageKey !== currentPage) {
        setCurrentPage(pageKey);
      }
    };
    handlePageChange();
  }, [currentPage]);

  const navigateTo = (pageKey) => {
    setCurrentPage(pageKey);
    setIsDrawerOpen(false);
  };

  const handleViewDetail = (record) => {
    setSelectedRecord(record);
    setCurrentPage('recordDetail');
  };

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden font-sans text-slate-100 flex flex-col">
      <div className="hidden" data-page-key={currentPage}></div>
      
      {/* 顶部主导航 */}
      <div className="flex-none h-16 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-5 z-10 sticky top-0">
        <button 
          onClick={() => setIsDrawerOpen(true)}
          className="text-slate-400 active:bg-slate-800 w-10 h-10 flex items-center justify-center rounded-full transition-colors"
          data-ai-alt="打开抽屉菜单"
        >
          <i className="fas fa-bars text-xl"></i>
        </button>
        <h1 className="text-lg font-semibold tracking-tight text-white">
          医疗档案
        </h1>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <Home 
          records={records} 
          setRecords={setRecords} 
          onViewDetail={handleViewDetail} 
          isLoggedIn={isLoggedIn}
        />
      </div>

      <VoiceButton />

      <Drawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)}
        navigateTo={navigateTo}
        currentPage={currentPage}
        isLoggedIn={isLoggedIn}
      />

      <Records 
        isOpen={currentPage === 'records'}
        onClose={() => navigateTo('index')}
        records={records}
        onViewDetail={handleViewDetail}
      />

      <Statistics 
        isOpen={currentPage === 'statistics'}
        onClose={() => navigateTo('index')}
        records={records}
      />

      <RecordDetail 
        isOpen={currentPage === 'recordDetail'}
        onClose={() => setCurrentPage('records')}
        record={selectedRecord}
      />

      <Login 
        isOpen={currentPage === 'login'}
        onClose={() => setCurrentPage('index')}
        onLoginSuccess={() => setIsLoggedIn(true)}
      />
    </div>
  );
}

export default App;
