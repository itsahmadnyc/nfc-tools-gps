import React, { useState, useEffect } from 'react';
import axios from 'axios';

const NFCScanner = ({ nfcStatus, updateNFCStatus, addLog, systemError, setSystemError }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cardInfo, setCardInfo] = useState(null);
  const [scanCount, setScanCount] = useState(0);
  const [autoSendToAPI, setAutoSendToAPI] = useState(true);
  const [isSendingToAPI, setIsSendingToAPI] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);

  const API_ENDPOINT = 'https://gps-api.jeuxtesting.com/api/event/checkin-checkout';

  // Text-to-speech function
  const speak = (text, success = true) => {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.8;
        utterance.pitch = success ? 1.1 : 0.9;
        utterance.volume = 0.8;
        
        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(voice => voice.lang.startsWith('en'));
        if (englishVoice) {
          utterance.voice = englishVoice;
        }
        
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Text-to-speech error:', err);
      }
    }
  };

  const sendToAPI = async (text) => {
    if (!text || text.trim().length === 0) {
      addLog('No user ID found on card', 'warning');
      speak('No user ID found on card', false);
      return;
    }

    setIsSendingToAPI(true);
    setApiResponse(null);
    addLog(`Sending attendance for user: ${text.trim()}`, 'info');

    try {
      const response = await axios.post(API_ENDPOINT, {
        user_id: text.trim(),
      }, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000
      });

      setApiResponse({
        success: true,
        data: response.data,
        status: response.status
      });
      
      addLog(`✅ Attendance recorded for user ${text.trim()} (Status: ${response.status})`, 'success');
      setScanCount(prev => prev + 1);
      speak(`Attendance recorded for user ${text.trim()}`, true);
      
    } catch (err) {
      console.error('API Error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to record attendance';
      setApiResponse({
        success: false,
        error: errorMsg,
        status: err.response?.status
      });
      addLog(`❌ Failed to record attendance: ${errorMsg}`, 'error');
      speak('Failed to record attendance', false);
    } finally {
      setIsSendingToAPI(false);
    }
  };

  useEffect(() => {
    if (!window.nfcAPI) {
      setSystemError('NFC API not available - make sure NFC libraries are installed');
      return;
    }

    updateNFCStatus();
    setIsScanning(nfcStatus.initialized);

    // Listen for system errors
    const errorCleanup = window.nfcAPI.onNFCError((error) => {
      if (error.type === 'system') {
        setSystemError(`System Error: ${error.message}`);
        addLog(`System Error: ${error.message}`, 'error');
      }
    });

    // Listen for card detection
    const cardDetectedCleanup = window.nfcAPI.onCardDetected(async (data) => {
      console.log('Card detected:', data);
      setCardInfo(data);
      setApiResponse(null);
      addLog(`Card detected: ${data.type} (UID: ${data.uid})`, 'info');
      
      try {
        const cardDetails = await window.nfcAPI.getCardInfo();
        if (cardDetails.success) {
          setCardInfo(prev => ({ ...prev, ...cardDetails }));
        }
      } catch (error) {
        console.error('Failed to get card info:', error);
      }

      // Auto-read and send to API if enabled
      if (autoSendToAPI) {
        try {
          const result = await window.nfcAPI.readPageText();
          if (result.success && result.text && result.text.trim()) {
            await sendToAPI(result.text);
          } else {
            addLog('Card is empty - no attendance to record', 'warning');
            speak('Card is empty', false);
          }
        } catch (error) {
          addLog(`Auto-read failed: ${error.message}`, 'error');
          speak('Card read failed', false);
        }
      }
    });

    // Listen for card removal
    const cardRemovedCleanup = window.nfcAPI.onCardRemoved(() => {
      setCardInfo(null);
      setApiResponse(null);
      addLog('Card removed', 'info');
    });

    return () => {
      errorCleanup();
      cardDetectedCleanup();
      cardRemovedCleanup();
    };
  }, [autoSendToAPI, nfcStatus.initialized]);

  const startScanning = async () => {
    try {
      setSystemError(null);
      const result = await window.nfcAPI.startNFC();
      if (result.success) {
        setIsScanning(true);
        await updateNFCStatus();
        addLog('NFC scanning started', 'success');
        speak('NFC scanning started', true);
      } else {
        setSystemError(`Failed to start NFC: ${result.error}`);
        addLog(`Failed to start NFC: ${result.error}`, 'error');
      }
    } catch (error) {
      const errorMsg = `Failed to start NFC: ${error.message}`;
      setSystemError(errorMsg);
      addLog(errorMsg, 'error');
    }
  };

  const stopScanning = async () => {
    try {
      await window.nfcAPI.stopNFC();
      setIsScanning(false);
      await updateNFCStatus();
      addLog('NFC scanning stopped', 'info');
      speak('NFC scanning stopped', true);
    } catch (error) {
      console.error('Failed to stop NFC:', error);
      addLog(`Failed to stop NFC: ${error.message}`, 'error');
    }
  };

  return (
    <div className="bg-white border-2 rounded-xl p-6 shadow-lg" style={{ borderColor: '#d35c57' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold mb-3" style={{ color: '#d35c57' }}>
            📡 NFC Scanner Control
          </h2>
          <div className="flex items-center space-x-6 mb-4">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
              isScanning 
                ? 'text-white' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`} style={{ 
              backgroundColor: isScanning ? '#d35c57' : undefined 
            }}>
              <div className={`w-3 h-3 rounded-full mr-2 ${
                isScanning ? 'bg-white animate-pulse' : 'bg-red-500'
              }`}></div>
              {isScanning ? 'ACTIVE' : 'INACTIVE'}
            </div>
            
            <div className="text-gray-700 font-medium">
              <span className="text-gray-500">Readers:</span> {nfcStatus.readerCount}
            </div>
          </div>

          {/* Auto-send toggle */}
          <div className="flex items-center space-x-3 mb-4">
            <label className="flex items-center text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSendToAPI}
                onChange={(e) => setAutoSendToAPI(e.target.checked)}
                className="mr-2"
              />
              Auto-send attendance on card detection
            </label>
          </div>

          {/* API Status */}
          {(isSendingToAPI || apiResponse) && (
            <div className="mb-4">
              {isSendingToAPI && (
                <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border-2 border-blue-200">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Recording Attendance...
                </div>
              )}
              
              {apiResponse && !isSendingToAPI && (
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border-2 ${
                  apiResponse.success 
                    ? 'bg-green-100 text-green-800 border-green-200' 
                    : 'bg-red-100 text-red-800 border-red-200'
                }`}>
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    apiResponse.success ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  {apiResponse.success ? '✅ Attendance Recorded' : '❌ Recording Failed'}
                </div>
              )}
            </div>
          )}
          
          {/* Card Information */}
          {cardInfo && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center mb-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                <h3 className="text-sm font-bold text-blue-800">Card Detected</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                <div><span className="font-medium">UID:</span> {cardInfo.uid}</div>
                <div><span className="font-medium">Type:</span> {cardInfo.type}</div>
                <div><span className="font-medium">Standard:</span> {cardInfo.standard}</div>
                {cardInfo.atr && (
                  <div><span className="font-medium">ATR:</span> {cardInfo.atr.substring(0, 16)}...</div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Scan counter */}
        <div className="text-right">
          <div className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-full">
            <span className="text-sm font-medium text-gray-700">
              Cards Scanned: <span className="font-bold" style={{ color: '#d35c57' }}>{scanCount}</span>
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex space-x-3">
        <button
          onClick={updateNFCStatus}
          className="px-4 py-2 border-2 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          style={{ borderColor: '#d35c57' }}
        >
          🔄 Refresh Status
        </button>
        
        {isScanning ? (
          <button
            onClick={stopScanning}
            className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shadow-md"
          >
            ⏹ Stop NFC Scanning
          </button>
        ) : (
          <button
            onClick={startScanning}
            className="px-6 py-2 text-white rounded-lg font-medium hover:opacity-90 transition-opacity shadow-md"
            style={{ backgroundColor: '#d35c57' }}
          >
            ▶ Start NFC Scanning
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
        <p className="font-medium text-blue-800 mb-1">💡 Scanner Instructions:</p>
        <ul className="list-disc list-inside space-y-1 text-blue-700">
          <li>Click "Start NFC Scanning" to begin monitoring for cards</li>
          <li>Enable auto-send to automatically record attendance when cards are detected</li>
          <li>Place NFC cards on the reader - system will detect and process automatically</li>
          <li>Voice feedback will confirm successful attendance recording</li>
        </ul>
      </div>
    </div>
  );
};

export default NFCScanner;