import React, { useState, useEffect } from 'react';
import NFCScanner from './Components/NFCScanner';
import CardReader from './Components/NTAGReader';
import CardWriter from './Components/NTAGWriter';


const NFC = () => {
  const [activeTab, setActiveTab] = useState('scanner');
  const [nfcStatus, setNfcStatus] = useState({
    initialized: false,
    readers: [],
    readerCount: 0,
    hasCard: false,
    currentConfig: null
  });
  const [systemError, setSystemError] = useState(null);
  const [logs, setLogs] = useState([]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog = {
      id: Date.now(),
      timestamp,
      message,
      type
    };
    setLogs(prev => [newLog, ...prev.slice(0, 49)]); // Keep last 50 logs
  };

  const updateNFCStatus = async () => {
    try {
      if (!window.nfcAPI) {
        setSystemError('NFC API not available - make sure NFC libraries are installed');
        return;
      }
      const status = await window.nfcAPI.getNFCStatus();
      setNfcStatus(status);
    } catch (error) {
      console.error('Failed to get NFC status:', error);
      setSystemError(`Failed to get NFC status: ${error.message}`);
    }
  };

  useEffect(() => {
    updateNFCStatus();
    addLog('GPS Attendance System initialized', 'success');
  }, []);

  const clearLogs = () => {
    setLogs([]);
    addLog('Logs cleared', 'info');
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <div className="shadow-sm" style={{ backgroundColor: '#d35c57' }}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 p-3 rounded-lg">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">
                  GPS Attendance System
                </h1>
                <p className="text-white/90 text-lg">
                  Component-Based NFC Card Reader & Writer
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Activity Logs Panel */}
        <div className="mb-6">
          <div className="bg-white border-2 rounded-xl p-6 shadow-lg" style={{ borderColor: '#d35c57' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#d35c57' }}>📋 Activity Log</h2>
              <button
                onClick={clearLogs}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Clear Logs
              </button>
            </div>

            <div className="h-32 overflow-y-auto bg-gray-50 border border-gray-200 rounded-lg p-3">
              {logs.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No activity yet...</p>
              ) : (
                <div className="space-y-1">
                  {logs.map((log) => (
                    <div key={log.id} className="text-sm">
                      <span className="text-gray-400 font-mono text-xs">[{log.timestamp}]</span>
                      <span className={`ml-2 ${getLogColor(log.type)}`}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* System Error Display */}
        {systemError && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-bold text-red-800">⚠ System Error</h3>
                <div className="mt-1 text-sm text-red-700 font-medium">{systemError}</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden" style={{ border: '2px solid #d35c57' }}>
            <nav className="flex">
              <button
                onClick={() => setActiveTab('scanner')}
                className={`flex-1 py-4 px-6 font-bold text-lg transition-all ${
                  activeTab === 'scanner'
                    ? 'text-white shadow-inner'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                style={{ 
                  backgroundColor: activeTab === 'scanner' ? '#d35c57' : 'transparent'
                }}
              >
                📡 NFC Scanner
              </button>
              <button
                onClick={() => setActiveTab('reader')}
                className={`flex-1 py-4 px-6 font-bold text-lg transition-all ${
                  activeTab === 'reader'
                    ? 'text-white shadow-inner'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                style={{ 
                  backgroundColor: activeTab === 'reader' ? '#d35c57' : 'transparent'
                }}
              >
                📖 Card Reader
              </button>
              <button
                onClick={() => setActiveTab('writer')}
                className={`flex-1 py-4 px-6 font-bold text-lg transition-all ${
                  activeTab === 'writer'
                    ? 'text-white shadow-inner'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                style={{ 
                  backgroundColor: activeTab === 'writer' ? '#d35c57' : 'transparent'
                }}
              >
                ✏️ Card Writer
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mb-8">
          {activeTab === 'scanner' && (
            <NFCScanner 
              nfcStatus={nfcStatus}
              updateNFCStatus={updateNFCStatus}
              addLog={addLog}
              systemError={systemError}
              setSystemError={setSystemError}
            />
          )}
          {activeTab === 'reader' && (
            <CardReader addLog={addLog} />
          )}
          {activeTab === 'writer' && (
            <CardWriter addLog={addLog} />
          )}
        </div>

        {/* Quick Help Guide */}
        <div className="bg-white border-2 rounded-xl p-6 shadow-lg" style={{ borderColor: '#d35c57' }}>
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 p-2 rounded-lg mr-3">
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold" style={{ color: '#d35c57' }}>
              📋 System Guide
            </h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-bold text-blue-800 mb-2">📡 NFC Scanner</h4>
              <p className="text-sm text-blue-700">Manage NFC connection, start/stop scanning, and view real-time card detection with auto-attendance</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-bold text-green-800 mb-2">📖 Card Reader</h4>
              <p className="text-sm text-green-700">Read user IDs from NFC cards and manually send attendance to API system</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-bold text-purple-800 mb-2">✏️ Card Writer</h4>
              <p className="text-sm text-purple-700">Write user IDs to NFC cards by selecting from user database or manual entry</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFC;