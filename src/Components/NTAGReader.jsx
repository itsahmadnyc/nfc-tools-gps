import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CardReader = ({ addLog }) => {
  const [readResult, setReadResult] = useState(null);
  const [isReading, setIsReading] = useState(false);
  const [isSendingToAPI, setIsSendingToAPI] = useState(false);
  const [apiResponse, setApiResponse] = useState(null);
  const [autoReadEnabled, setAutoReadEnabled] = useState(true);
  const [cardInfo, setCardInfo] = useState(null);

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

  // Auto-detection setup
  useEffect(() => {
    if (!window.nfcAPI) {
      addLog('NFC API not available in CardReader', 'error');
      return;
    }

    // Listen for card detection
    const cardDetectedCleanup = window.nfcAPI.onCardDetected(async (data) => {
      console.log('Card detected in CardReader:', data);
      setCardInfo(data);
      setApiResponse(null);
      setReadResult(null);
      addLog(`Card detected in Reader: ${data.type} (UID: ${data.uid})`, 'info');
      
      // Auto-read and send to API if enabled
      if (autoReadEnabled) {
        await handleAutoRead();
      }
    });

    // Listen for card removal
    const cardRemovedCleanup = window.nfcAPI.onCardRemoved(() => {
      setCardInfo(null);
      setApiResponse(null);
      addLog('Card removed from reader', 'info');
    });

    return () => {
      cardDetectedCleanup();
      cardRemovedCleanup();
    };
  }, [autoReadEnabled]);

  const handleAutoRead = async () => {
    if (!window.nfcAPI) {
      addLog('NFC API not available', 'error');
      return;
    }

    setIsReading(true);
    setReadResult(null);
    setApiResponse(null);
    addLog('Auto-reading card...', 'info');
    
    try {
      const result = await window.nfcAPI.readPageText();
      setReadResult(result);
      
      if (result.success) {
        addLog(`Card read successful: "${result.text || '(empty)'}"`, 'success');
        
        // Automatically send to API if successful and has text
        if (result.text && result.text.trim()) {
          await sendToAPI(result.text);
        } else {
          addLog('Card is empty - no user ID to send', 'warning');
          speak('Card is empty', false);
        }
      } else {
        addLog(`Card read failed: ${result.error}`, 'error');
        speak('Card read failed', false);
      }
    } catch (error) {
      const errorMsg = error.message || 'Unknown error occurred';
      setReadResult({ success: false, error: errorMsg });
      addLog(`Card read error: ${errorMsg}`, 'error');
      speak('Card read failed', false);
    } finally {
      setIsReading(false);
    }
  };

  const handleReadOnly = async () => {
    if (!window.nfcAPI) {
      addLog('NFC API not available', 'error');
      return;
    }

    setIsReading(true);
    setReadResult(null);
    addLog('Reading card (no API send)...', 'info');
    
    try {
      const result = await window.nfcAPI.readPageText();
      setReadResult(result);
      
      if (result.success) {
        addLog(`Card read successful: "${result.text || '(empty)'}"`, 'success');
      } else {
        addLog(`Card read failed: ${result.error}`, 'error');
      }
    } catch (error) {
      const errorMsg = error.message || 'Unknown error occurred';
      setReadResult({ success: false, error: errorMsg });
      addLog(`Card read error: ${errorMsg}`, 'error');
    } finally {
      setIsReading(false);
    }
  };

  const handleRead = async () => {
    if (!window.nfcAPI) {
      addLog('NFC API not available', 'error');
      return;
    }

    setIsReading(true);
    setReadResult(null);
    setApiResponse(null);
    addLog('Reading card...', 'info');
    
    try {
      const result = await window.nfcAPI.readPageText();
      setReadResult(result);
      
      if (result.success) {
        addLog(`Card read successful: "${result.text || '(empty)'}"`, 'success');
        
        // Automatically send to API if successful and has text
        if (result.text && result.text.trim()) {
          await sendToAPI(result.text);
        } else {
          addLog('Card is empty - no user ID to send', 'warning');
          speak('Card is empty', false);
        }
      } else {
        addLog(`Card read failed: ${result.error}`, 'error');
        speak('Card read failed', false);
      }
    } catch (error) {
      const errorMsg = error.message || 'Unknown error occurred';
      setReadResult({ success: false, error: errorMsg });
      addLog(`Card read error: ${errorMsg}`, 'error');
      speak('Card read failed', false);
    } finally {
      setIsReading(false);
    }
  };

  const clearResult = () => {
    setReadResult(null);
    setApiResponse(null);
    addLog('Read result cleared', 'info');
  };

  return (
    <div className="bg-white border-2 rounded-xl p-6 shadow-lg" style={{ borderColor: '#d35c57' }}>
      <h3 className="text-xl font-bold mb-4" style={{ color: '#d35c57' }}>📖 Card Reader</h3>
      
      {/* Auto-read toggle */}
      <div className="flex items-center space-x-3 mb-4">
        <label className="flex items-center text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={autoReadEnabled}
            onChange={(e) => setAutoReadEnabled(e.target.checked)}
            className="mr-2"
          />
          Auto-read cards when detected
        </label>
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
          autoReadEnabled 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-gray-100 text-gray-600 border border-gray-200'
        }`}>
          {autoReadEnabled ? '🟢 AUTO-READ ON' : '🔴 AUTO-READ OFF'}
        </div>
      </div>

      {/* Card Detection Status */}
      {cardInfo && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center mb-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
            <h4 className="text-sm font-bold text-blue-800">Card Detected</h4>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
            <div><span className="font-medium">UID:</span> {cardInfo.uid}</div>
            <div><span className="font-medium">Type:</span> {cardInfo.type}</div>
          </div>
        </div>
      )}
      
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={handleRead}
          disabled={isReading || isSendingToAPI}
          className="px-6 py-3 text-white rounded-lg font-medium hover:opacity-90 transition-opacity shadow-md disabled:opacity-50"
          style={{ backgroundColor: '#d35c57' }}
        >
          {isReading ? '🔄 Reading...' : isSendingToAPI ? '📡 Sending...' : '📖 Read & Send to API'}
        </button>

        <button
          onClick={handleReadOnly}
          disabled={isReading || isSendingToAPI}
          className="px-6 py-3 border-2 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          style={{ borderColor: '#d35c57', color: '#d35c57' }}
        >
          {isReading ? '🔄 Reading...' : '📖 Read Only'}
        </button>
        
        {(readResult || apiResponse) && (
          <button
            onClick={clearResult}
            className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Clear Results
          </button>
        )}
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
              {apiResponse.success ? '✅ Attendance Recorded Successfully' : '❌ Attendance Recording Failed'}
            </div>
          )}
        </div>
      )}

      {/* Read Result Display */}
      {readResult && (
        <div className={`p-4 rounded-lg mb-4 ${readResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {readResult.success ? (
            <div>
              <div className="font-bold text-green-800 mb-2">✅ Card Read Successful</div>
              <div className="text-sm text-green-700 space-y-1">
                <div><span className="font-medium">Text Data:</span> <span className="font-mono bg-white px-2 py-1 rounded">"{readResult.text || '(empty)'}"</span></div>
                <div><span className="font-medium">Raw Hex:</span> <span className="font-mono text-xs bg-white px-2 py-1 rounded">{readResult.rawHex}</span></div>
                <div><span className="font-medium">Data Size:</span> {readResult.dataSize} bytes</div>
                {readResult.text && readResult.text.trim() && !isSendingToAPI && apiResponse?.success && (
                  <div className="mt-2 p-2 bg-blue-100 rounded text-blue-800 text-sm">
                    🚀 User ID "{readResult.text.trim()}" sent to attendance API successfully
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="font-bold text-red-800 mb-2">❌ Card Read Failed</div>
              <div className="text-sm text-red-700">{readResult.error}</div>
            </div>
          )}
        </div>
      )}

      {/* API Response Details */}
      {apiResponse && (
        <div className={`p-4 rounded-lg mb-4 ${apiResponse.success ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="font-bold mb-2" style={{ color: apiResponse.success ? '#1e40af' : '#dc2626' }}>
            {apiResponse.success ? '📡 API Response - Success' : '📡 API Response - Error'}
          </div>
          <div className="text-sm space-y-1" style={{ color: apiResponse.success ? '#1e40af' : '#dc2626' }}>
            <div><span className="font-medium">Status:</span> {apiResponse.status}</div>
            {apiResponse.success ? (
              <div><span className="font-medium">Response:</span> {JSON.stringify(apiResponse.data)}</div>
            ) : (
              <div><span className="font-medium">Error:</span> {apiResponse.error}</div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="font-medium text-blue-800 mb-1">💡 Reader Instructions:</p>
        <ul className="list-disc list-inside space-y-1 text-blue-700">
          <li><strong>Auto-read:</strong> When enabled, automatically reads and sends data when cards are detected</li>
          <li><strong>Read & Send to API:</strong> Manually reads the card and sends user ID to attendance system</li>
          <li><strong>Read Only:</strong> Just reads the card data without sending to API (for testing)</li>
          <li>Make sure NFC scanning is active in the Scanner tab</li>
          <li>Voice feedback will confirm attendance recording status</li>
        </ul>
      </div>
    </div>
  );
};

export default CardReader;