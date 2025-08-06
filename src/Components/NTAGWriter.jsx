import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const CardWriter = ({ addLog }) => {
  const [text, setText] = useState('');
  const [writeResult, setWriteResult] = useState(null);
  const [isWriting, setIsWriting] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [error, setError] = useState(null);
  
  // Refs for custom dropdown
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    setError(null);
    addLog('Loading users from API...', 'info');
    
    try {
      const response = await axios.get('https://gps-api.jeuxtesting.com/api/users-for-nfc');
      
      if (response.data.success) {
        setUsers(response.data.data);
        addLog(`Loaded ${response.data.data.length} users successfully`, 'success');
      } else {
        setError('Failed to load users');
        addLog('Failed to load users from API', 'error');
      }
    } catch (err) {
      const errorMsg = `Failed to load users: ${err.response?.data?.message || err.message}`;
      setError(errorMsg);
      addLog(errorMsg, 'error');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Handle clicks outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone.includes(searchTerm)
  );

  const selectUser = (user) => {
    setSelectedUser(user);
    setText(user.id.toString());
    setSearchTerm(`${user.firstName} ${user.lastName}`);
    setShowUserDropdown(false);
    addLog(`Selected user: ${user.firstName} ${user.lastName} (ID: ${user.id})`, 'info');
    
    // Focus back to input after selection
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowUserDropdown(true); // Always show dropdown when typing
    
    // Clear selected user if manually editing
    if (selectedUser && value !== `${selectedUser.firstName} ${selectedUser.lastName}`) {
      setSelectedUser(null);
      setText('');
    }
  };

  const handleInputFocus = () => {
    // Always show dropdown when input is focused
    setShowUserDropdown(true);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowUserDropdown(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown' && filteredUsers.length > 0) {
      e.preventDefault();
      setShowUserDropdown(true);
      // Focus first dropdown item if needed
    }
  };

  const handleWrite = async () => {
    if (!text.trim()) {
      addLog('No text to write', 'warning');
      return;
    }

    if (!window.nfcAPI) {
      addLog('NFC API not available', 'error');
      return;
    }
    
    setIsWriting(true);
    setWriteResult(null);
    addLog(`Writing "${text.trim()}" to card...`, 'info');
    
    try {
      // Use the correct API method for writing text to page
      const result = await window.nfcAPI.writePageText(text.trim());
      setWriteResult(result);
      
      if (result.success) {
        addLog(`✅ Successfully wrote "${text.trim()}" to card`, 'success');
        if (selectedUser) {
          addLog(`Card programmed for: ${selectedUser.firstName} ${selectedUser.lastName}`, 'success');
        }
        
        // Text-to-speech feedback
        if ('speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(`Card programmed successfully for ${selectedUser ? selectedUser.firstName : 'user'}`);
            utterance.rate = 0.8;
            utterance.pitch = 1.1;
            utterance.volume = 0.8;
            window.speechSynthesis.speak(utterance);
          } catch (err) {
            console.warn('Text-to-speech error:', err);
          }
        }
      } else {
        addLog(`❌ Write failed: ${result.error}`, 'error');
        
        // Error feedback
        if ('speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance('Card write failed');
            utterance.rate = 0.8;
            utterance.pitch = 0.9;
            utterance.volume = 0.8;
            window.speechSynthesis.speak(utterance);
          } catch (err) {
            console.warn('Text-to-speech error:', err);
          }
        }
      }
    } catch (error) {
      const errorMsg = error.message || 'Unknown write error occurred';
      setWriteResult({ success: false, error: errorMsg });
      addLog(`Write error: ${errorMsg}`, 'error');
    } finally {
      setIsWriting(false);
    }
  };

  const clearForm = () => {
    setText('');
    setSelectedUser(null);
    setSearchTerm('');
    setWriteResult(null);
    setError(null);
    setShowUserDropdown(false);
    addLog('Form cleared', 'info');
  };

  const clearUserSelection = () => {
    setSelectedUser(null);
    setSearchTerm('');
    setText('');
    setShowUserDropdown(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleManualTextChange = (e) => {
    const value = e.target.value;
    setText(value);
    // Clear selected user if manually editing
    if (selectedUser && value !== selectedUser.id.toString()) {
      setSelectedUser(null);
      setSearchTerm('');
    }
  };

  return (
    <div className="bg-white border-2 rounded-xl p-6 shadow-lg" style={{ borderColor: '#d35c57' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold" style={{ color: '#d35c57' }}>✏️ Card Writer</h3>
        <button
          onClick={loadUsers}
          disabled={isLoadingUsers}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          {isLoadingUsers ? '🔄 Loading...' : '🔄 Refresh Users'}
        </button>
      </div>

      {/* Custom User Search Dropdown */}
      <div className="mb-4 relative" ref={dropdownRef}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Users ({users.length} available):
        </label>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleInputKeyDown}
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-400 focus:border-red-400"
            placeholder="Type to search by name, email, or phone..."
            autoComplete="off"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {searchTerm && (
              <button
                type="button"
                onClick={clearUserSelection}
                className="mr-2 text-gray-400 hover:text-gray-600 pointer-events-auto"
                title="Clear search"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        {/* Custom User Dropdown */}
        {showUserDropdown && (
          <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-hidden">
            {isLoadingUsers ? (
              <div className="px-4 py-3 text-center text-gray-500">
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading users...
                </div>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="max-h-64 overflow-y-auto">
                {filteredUsers.slice(0, 15).map((user) => (
                  <div
                    key={user.id}
                    onMouseDown={(e) => {
                      // Prevent input blur when clicking on dropdown item
                      e.preventDefault();
                    }}
                    onClick={() => selectUser(user)}
                    className="px-4 py-3 hover:bg-red-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150 select-none"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                          {user.tier && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {user.tier}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">{user.email}</div>
                        <div className="text-sm text-gray-500">
                          ID: {user.id} • Phone: {user.phone}
                        </div>
                      </div>
                      {user.is_verified && (
                        <div className="ml-2 flex-shrink-0">
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {filteredUsers.length > 15 && (
                  <div className="px-4 py-2 text-center text-sm text-gray-500 bg-gray-50">
                    Showing first 15 of {filteredUsers.length} results
                  </div>
                )}
              </div>
            ) : (
              <div className="px-4 py-3 text-center text-gray-500">
                <div className="text-sm">No users found matching "{searchTerm}"</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected User Display */}
      {selectedUser && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800 mb-2 flex items-center">
                👤 Selected User
                {selectedUser.is_verified && (
                  <svg className="w-4 h-4 ml-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-red-700">
                <div>
                  <p><span className="font-medium">Name:</span> {selectedUser.firstName} {selectedUser.lastName}</p>
                  <p><span className="font-medium">Email:</span> {selectedUser.email}</p>
                </div>
                <div>
                  <p><span className="font-medium">User ID:</span> {selectedUser.id}</p>
                  <p><span className="font-medium">Phone:</span> {selectedUser.phone}</p>
                </div>
              </div>
            </div>
            <button
              onClick={clearUserSelection}
              className="ml-4 text-red-400 hover:text-red-600"
              title="Clear selection"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
    

      {/* Write Controls */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={handleWrite}
          disabled={isWriting || !text.trim()}
          className="px-6 py-3 text-white rounded-lg font-medium hover:opacity-90 transition-opacity shadow-md disabled:opacity-50"
          style={{ backgroundColor: '#d35c57' }}
        >
          {isWriting ? '🔄 Writing...' : '✏️ Write to Card'}
        </button>

        <button
          onClick={clearForm}
          className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Clear All
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Write Result */}
      {writeResult && (
        <div className={`p-4 rounded-lg mb-4 ${writeResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {writeResult.success ? (
            <div>
              <div className="font-bold text-green-800 mb-2">✅ Write Successful</div>
              <div className="text-sm text-green-700 space-y-1">
                <div><span className="font-medium">Message:</span> {writeResult.message}</div>
                <div><span className="font-medium">Verified:</span> {writeResult.verified ? 'Yes' : 'No'}</div>
                <div><span className="font-medium">Data Size:</span> {writeResult.dataSize} bytes</div>
                {selectedUser && (
                  <div className="mt-2 p-2 bg-blue-100 rounded text-blue-800">
                    <span className="font-medium">Programmed for:</span> {selectedUser.firstName} {selectedUser.lastName} (ID: {selectedUser.id})
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="font-bold text-red-800 mb-2">❌ Write Failed</div>
              <div className="text-sm text-red-700">{writeResult.error}</div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="font-medium text-blue-800 mb-1">💡 Writer Instructions:</p>
        <ul className="list-disc list-inside space-y-1 text-blue-700">
          <li><strong>Search Method:</strong> Search and select a user to automatically fill their ID</li>
          <li><strong>Manual Method:</strong> Directly enter any text (user ID, employee number, etc.)</li>
          <li>Place NFC card on the reader before clicking "Write to Card"</li>
          <li>Make sure NFC scanning is active in the Scanner tab</li>
          <li>Written cards will work with the attendance system</li>
          <li>Voice feedback will confirm write operation status</li>
        </ul>
      </div>
    </div>
  );
};

export default CardWriter;