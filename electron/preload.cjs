const { contextBridge, ipcRenderer } = require('electron');

// Expose simplified single-page NFC API to renderer process
contextBridge.exposeInMainWorld('nfcAPI', {
  // NFC Control
  startNFC: () => ipcRenderer.invoke('nfc-start'),
  stopNFC: () => ipcRenderer.invoke('nfc-stop'),
  getNFCStatus: () => ipcRenderer.invoke('nfc-status'),
  
  // Single page operations
  readPageText: () => ipcRenderer.invoke('nfc-read-page-text'),
  writePageText: (text) => ipcRenderer.invoke('nfc-write-page-text', text),
  getCardInfo: () => ipcRenderer.invoke('nfc-get-card-info'),
  setPageConfig: (configName) => ipcRenderer.invoke('nfc-set-page-config', configName),
  
  // Event listeners
  onCardDetected: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('nfc-card-detected', handler);
    return () => ipcRenderer.removeListener('nfc-card-detected', handler);
  },
  
  onCardRemoved: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('nfc-card-removed', handler);
    return () => ipcRenderer.removeListener('nfc-card-removed', handler);
  },
  
  onNFCError: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('nfc-error', handler);
    return () => ipcRenderer.removeListener('nfc-error', handler);
  },
  
  // Remove listeners (cleanup)
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('nfc-card-detected');
    ipcRenderer.removeAllListeners('nfc-card-removed');
    ipcRenderer.removeAllListeners('nfc-error');
  }
});

// Expose utilities for single-page data conversion
contextBridge.exposeInMainWorld('nfcUtils', {
  // Convert text to hex for writing
  textToHex: (text) => {
    try {
      return Array.from(text)
        .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      return '';
    }
  },
  
  // Convert hex to text for reading
  hexToText: (hex) => {
    try {
      const bytes = hex.match(/.{2}/g);
      if (!bytes) return '';
      return bytes
        .map(byte => parseInt(byte, 16))
        .filter(byte => byte >= 32 && byte <= 126) // Only printable ASCII
        .map(byte => String.fromCharCode(byte))
        .join('');
    } catch (error) {
      return '';
    }
  },
  
  // Format hex for display
  formatHex: (hex) => {
    try {
      return hex.toUpperCase().match(/.{2}/g)?.join(' ') || hex;
    } catch (error) {
      return hex;
    }
  },
  
  // Validate text input for single page storage
  validateText: (text, maxSize = 16) => {
    if (!text) return { valid: false, error: 'Text cannot be empty' };
    
    const textBytes = Buffer.from(text, 'utf8').length;
    
    if (textBytes > maxSize) {
      return { 
        valid: false, 
        error: `Text too long (${textBytes} bytes, max ${maxSize} bytes)` 
      };
    }
    return { valid: true, byteLength: textBytes };
  },
  
  // Get page configuration options
  getPageConfigs: () => {
    return {
      'PAGE_4': {
        name: 'Page 4 (Single)',
        maxSize: 4,
        description: '4 bytes - Employee ID or short code'
      },
      'PAGE_5': {
        name: 'Page 5 (Single)', 
        maxSize: 4,
        description: '4 bytes - Alternative page'
      },
      'PAGE_6': {
        name: 'Page 6 (Single)',
        maxSize: 4, 
        description: '4 bytes - Alternative page'
      },
      'PAGE_7': {
        name: 'Page 7 (Single)',
        maxSize: 4,
        description: '4 bytes - Alternative page'
      },
      'PAGE_4_EXTENDED': {
        name: 'Page 4 (Extended)',
        maxSize: 16,
        description: '16 bytes - Longer text or JSON data'
      },
      'MULTI_PAGE_BLOCK': {
        name: 'Multi-Page Block',
        maxSize: 64,
        description: '64 bytes - Maximum data if supported'
      }
    };
  },

  // Check if text looks like employee ID
  isEmployeeID: (text) => {
    return /^\d+$/.test(text.trim());
  },

  // Get simple storage benefits
  getSimpleStorageBenefits: () => {
    return [
      'No complex NDEF formatting required',
      'Direct byte-level access',
      'Faster read/write operations',
      'Better compatibility with problematic cards',
      'Simpler error handling',
      'Lower memory overhead'
    ];
  },

  // Convert number to fixed-width string (for employee IDs)
  formatEmployeeID: (id, width = 4) => {
    return id.toString().padStart(width, '0');
  },

  // Parse employee ID from text
  parseEmployeeID: (text) => {
    const match = text.match(/^\d+/);
    return match ? parseInt(match[0], 10) : null;
  }
});

console.log('Single-Page NFC Preload script loaded successfully');