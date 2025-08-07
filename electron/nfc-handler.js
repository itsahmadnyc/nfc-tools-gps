import { ipcMain, BrowserWindow } from 'electron';
import { NFC } from 'nfc-pcsc';

class ElectronNFCHandler {
  constructor() {
    console.log('🏗️ Creating ElectronNFCHandler instance...');
    
    try {
      console.log('📦 Initializing NFC instance from nfc-pcsc...');
      this.nfc = new NFC();
      console.log('✅ NFC instance created successfully');
    } catch (error) {
      console.error('❌ Failed to create NFC instance:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
    
    this.isInitialized = false;
    this.currentReader = null;
    this.currentCard = null;
    this.readers = [];
    
    // Simplified single-page configurations
    this.pageConfigs = {
      'PAGE_4': {
        pageNumber: 4,
        byteAddress: 16, // Page 4 = byte 16
        maxDataSize: 16, // Single page = 16 bytes max
        description: 'Single Page 4 - 16 bytes simple storage'
      },
      'PAGE_5': {
        pageNumber: 5,
        byteAddress: 20, // Page 5 = byte 20
        maxDataSize: 16,
        description: 'Single Page 5 - 16 bytes simple storage'
      },
      'PAGE_6': {
        pageNumber: 6,
        byteAddress: 24, // Page 6 = byte 24
        maxDataSize: 16,
        description: 'Single Page 6 - 16 bytes simple storage'
      },
      'PAGE_7': {
        pageNumber: 7,
        byteAddress: 28, // Page 7 = byte 28
        maxDataSize: 16,
        description: 'Single Page 7 - 16 bytes simple storage'
      },
      'MULTI_PAGE_BLOCK': {
        pageNumber: 4,
        byteAddress: 16,
        maxDataSize: 64, // Try reading 4 pages as a block (16 bytes each)
        description: 'Multi-page block read - 64 bytes (4 pages)'
      }
    };
    
    // Default to page 4
    this.currentPageConfig = this.pageConfigs['PAGE_4'];
    
    console.log('🔧 Setting up IPC handlers...');
    this.setupIPC();
    console.log('✅ IPC handlers setup completed');
    
    console.log('🚀 Initializing NFC system...');
    this.init();
    console.log('✅ NFC system initialization completed');
  }

  init() {
    this.nfc.on('reader', (reader) => {
      console.log(`📱 Reader connected: ${reader.reader.name}`);
      this.readers.push(reader.reader.name);
      this.currentReader = reader;
      
      reader.on('card', async (card) => {
        try {
          console.log(`🔍 Card detected: ${card.uid}`);
          this.currentCard = card;
          
          // Test which pages/methods work for this card
          const compatibility = await this.testCardCompatibility(reader, card);
          
          // Notify renderer about card detection
          this.sendToRenderer('nfc-card-detected', {
            uid: card.uid,
            type: card.type,
            standard: card.standard,
            atr: card.atr ? card.atr.toString('hex') : null,
            compatibility: compatibility,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('❌ Error processing card:', error);
          this.sendToRenderer('nfc-error', {
            type: 'card_processing',
            message: `Error processing card: ${error.message}`,
            timestamp: new Date().toISOString()
          });
        }
      });
      
      reader.on('card.off', () => {
        console.log('📤 Card removed');
        this.currentCard = null;
        this.sendToRenderer('nfc-card-removed', {
          timestamp: new Date().toISOString()
        });
      });
      
      reader.on('error', (err) => {
        console.error('📱 Reader error:', err.message);
        this.sendToRenderer('nfc-error', {
          type: 'reader',
          message: err.message,
          timestamp: new Date().toISOString()
        });
      });
    });
    
    this.nfc.on('error', (err) => {
      console.error('💥 NFC System Error:', err.message);
      this.sendToRenderer('nfc-error', {
        type: 'system',
        message: err.message,
        timestamp: new Date().toISOString()
      });
    });
    
    this.isInitialized = true;
  }

  async testCardCompatibility(reader, card) {
    console.log('🧪 Testing card compatibility with different read methods...');
    const results = {
      cardInfo: {
        type: card.type,
        standard: card.standard,
        atr: card.atr ? card.atr.toString('hex') : null
      },
      readMethods: {},
      recommendedMethod: null,
      workingPages: []
    };

    // Test different read methods and pages
    const testCases = [
      { name: 'PAGE_4_SINGLE', address: 16, length: 4, description: 'Single page 4 (4 bytes)' },
      { name: 'PAGE_4_EXTENDED', address: 16, length: 16, description: 'Page 4 extended (16 bytes)' },
      { name: 'PAGE_5_SINGLE', address: 20, length: 4, description: 'Single page 5 (4 bytes)' },
      { name: 'PAGE_6_SINGLE', address: 24, length: 4, description: 'Single page 6 (4 bytes)' },
      { name: 'PAGE_7_SINGLE', address: 28, length: 4, description: 'Single page 7 (4 bytes)' },
      { name: 'MULTI_PAGE_BLOCK', address: 16, length: 64, description: 'Multi-page block (64 bytes)' },
      { name: 'HEADER_READ', address: 0, length: 16, description: 'Header pages (0-3)' },
    ];

    for (const testCase of testCases) {
      try {
        console.log(`🧪 Testing ${testCase.name}: ${testCase.description}`);
        const data = await reader.read(testCase.address, testCase.length);
        results.readMethods[testCase.name] = {
          success: true,
          dataLength: data.length,
          sample: data.slice(0, Math.min(8, data.length)).toString('hex'),
          description: testCase.description
        };
        console.log(`✅ ${testCase.name} successful - read ${data.length} bytes`);
        
        // If this is a page test, add to working pages
        if (testCase.name.includes('PAGE_')) {
          const pageNum = Math.floor(testCase.address / 4);
          results.workingPages.push(pageNum);
        }
        
      } catch (error) {
        results.readMethods[testCase.name] = {
          success: false,
          error: error.message,
          description: testCase.description
        };
        console.log(`❌ ${testCase.name} failed: ${error.message}`);
      }
    }

    // Determine the best method to use
    if (results.readMethods.PAGE_4_EXTENDED?.success) {
      results.recommendedMethod = 'PAGE_4_EXTENDED';
      this.currentPageConfig = {
        pageNumber: 4,
        byteAddress: 16,
        maxDataSize: 16,
        description: 'Page 4 extended mode - 16 bytes'
      };
    } else if (results.readMethods.PAGE_4_SINGLE?.success) {
      results.recommendedMethod = 'PAGE_4_SINGLE';
      this.currentPageConfig = {
        pageNumber: 4,
        byteAddress: 16,
        maxDataSize: 4,
        description: 'Page 4 single mode - 4 bytes'
      };
    } else if (results.readMethods.PAGE_5_SINGLE?.success) {
      results.recommendedMethod = 'PAGE_5_SINGLE';
      this.currentPageConfig = {
        pageNumber: 5,
        byteAddress: 20,
        maxDataSize: 4,
        description: 'Page 5 single mode - 4 bytes'
      };
    } else if (results.readMethods.MULTI_PAGE_BLOCK?.success) {
      results.recommendedMethod = 'MULTI_PAGE_BLOCK';
      this.currentPageConfig = {
        pageNumber: 4,
        byteAddress: 16,
        maxDataSize: 64,
        description: 'Multi-page block mode - 64 bytes'
      };
    }

    console.log(`🎯 Recommended method: ${results.recommendedMethod || 'NONE'}`);
    console.log(`🔧 Using config: ${this.currentPageConfig.description}`);

    return results;
  }

  setupIPC() {
    console.log('📋 Registering IPC handlers...');
    
    // Start NFC
    ipcMain.handle('nfc-start', async () => {
      console.log('📡 IPC: nfc-start called');
      try {
        if (!this.isInitialized) {
          this.init();
        }
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Stop NFC
    ipcMain.handle('nfc-stop', async () => {
      console.log('📡 IPC: nfc-stop called');
      try {
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Get NFC status
    ipcMain.handle('nfc-status', async () => {
      console.log('📡 IPC: nfc-status called');
      return {
        initialized: this.isInitialized,
        readers: this.readers,
        readerCount: this.readers.length,
        hasCard: !!this.currentCard,
        currentConfig: this.currentPageConfig
      };
    });

    // Read text from single page
    ipcMain.handle('nfc-read-page-text', async () => {
      return await this.readPageText();
    });

    // Write text to single page
    ipcMain.handle('nfc-write-page-text', async (event, text) => {
      return await this.writePageText(text);
    });

    // Get card information
    ipcMain.handle('nfc-get-card-info', async () => {
      return await this.getCardInfo();
    });

    // Set page configuration
    ipcMain.handle('nfc-set-page-config', async (event, configName) => {
      console.log('📡 IPC: nfc-set-page-config called');
      return await this.setPageConfig(configName);
    });
    
    console.log('📋 All IPC handlers registered successfully');
  }

  async setPageConfig(configName) {
    if (this.pageConfigs[configName]) {
      this.currentPageConfig = this.pageConfigs[configName];
      console.log(`🔧 Switched to ${configName}: ${this.currentPageConfig.description}`);
      return { success: true, config: this.currentPageConfig };
    } else {
      return { 
        success: false, 
        error: `Unknown config: ${configName}`,
        availableConfigs: Object.keys(this.pageConfigs)
      };
    }
  }

  async getCardInfo() {
    if (!this.currentReader || !this.currentCard) {
      return { 
        success: false, 
        error: 'No card present. Please place a card on the reader.' 
      };
    }

    try {
      console.log('🔍 Getting card info...');
      
      // Test current configuration
      const testResult = await this.testSingleRead();
      
      return {
        success: true,
        uid: this.currentCard.uid,
        type: this.currentCard.type,
        standard: this.currentCard.standard,
        atr: this.currentCard.atr ? this.currentCard.atr.toString('hex') : null,
        currentConfig: this.currentPageConfig,
        testResult: testResult,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Failed to get card info:', error.message);
      return {
        success: false,
        error: `Failed to get card info: ${error.message}`
      };
    }
  }

  async testSingleRead() {
    try {
      console.log(`🧪 Testing read with current config: ${this.currentPageConfig.description}`);
      const data = await this.currentReader.read(
        this.currentPageConfig.byteAddress, 
        this.currentPageConfig.maxDataSize
      );
      
      return {
        success: true,
        dataLength: data.length,
        hexData: data.toString('hex').toUpperCase(),
        textData: this.bufferToText(data),
        config: this.currentPageConfig
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        config: this.currentPageConfig
      };
    }
  }

  async readPageText() {
    if (!this.currentReader || !this.currentCard) {
      return { 
        success: false, 
        error: 'No card present. Please place a card on the reader.' 
      };
    }

    try {
      console.log(`📖 Reading from ${this.currentPageConfig.description}...`);
      
      const data = await this.currentReader.read(
        this.currentPageConfig.byteAddress,
        this.currentPageConfig.maxDataSize
      );
      
      const text = this.bufferToText(data);
      const hexData = data.toString('hex').toUpperCase();
      
      console.log(`📖 Read successful: "${text}" (${data.length} bytes)`);
      console.log(`📖 Hex: ${hexData}`);
      
      return {
        success: true,
        text: text,
        rawHex: hexData,
        dataSize: data.length,
        config: this.currentPageConfig,
        isEmpty: text.length === 0,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Read failed:', error.message);
      return {
        success: false,
        error: `Read failed: ${error.message}`
      };
    }
  }

  async writePageText(text) {
    if (!this.currentReader || !this.currentCard) {
      return { 
        success: false, 
        error: 'No card present. Please place a card on the reader.' 
      };
    }

    if (!text || text.trim().length === 0) {
      return { 
        success: false, 
        error: 'Text cannot be empty' 
      };
    }

    try {
      console.log(`📝 Writing to ${this.currentPageConfig.description}: "${text}"`);

      // Convert text to buffer and check size
      const textBuffer = Buffer.from(text, 'utf8');
      if (textBuffer.length > this.currentPageConfig.maxDataSize) {
        return { 
          success: false, 
          error: `Text too long (maximum ${this.currentPageConfig.maxDataSize} bytes for ${this.currentPageConfig.description})` 
        };
      }

      // Pad buffer to exact page size
      const writeBuffer = Buffer.alloc(this.currentPageConfig.maxDataSize);
      textBuffer.copy(writeBuffer);
      
      console.log(`📝 Writing ${writeBuffer.length} bytes: ${writeBuffer.toString('hex').toUpperCase()}`);
      
      // Try different write methods
      let writeSuccess = false;
      let writeError = null;

      // Method 1: Direct write
      try {
        await this.currentReader.write(
          this.currentPageConfig.byteAddress,
          writeBuffer,
          writeBuffer.length
        );
        writeSuccess = true;
        console.log('✅ Direct write successful');
      } catch (error) {
        console.log(`❌ Direct write failed: ${error.message}`);
        writeError = error.message;
      }

      // Method 2: Single page write (4 bytes at a time) if direct write failed
      if (!writeSuccess && this.currentPageConfig.maxDataSize > 4) {
        try {
          console.log('🔄 Trying single page write method...');
          const pageData = writeBuffer.slice(0, 4);
          await this.currentReader.write(
            this.currentPageConfig.byteAddress,
            pageData,
            4
          );
          writeSuccess = true;
          console.log('✅ Single page write successful');
        } catch (error) {
          console.log(`❌ Single page write failed: ${error.message}`);
          writeError = error.message;
        }
      }

      if (!writeSuccess) {
        return {
          success: false,
          error: `Write failed: ${writeError}`
        };
      }
      
      // Verify the write by reading back
      console.log('🔍 Verifying write operation...');
      const verification = await this.readPageText();
      const success = verification.success && verification.text.trim() === text.trim();
      
      console.log(`📝 Write verification: ${success ? 'Verified ✅' : 'Verification failed ❌'}`);
      
      return {
        success: true,
        message: `Text "${text}" written successfully to ${this.currentPageConfig.description}`,
        verified: success,
        dataSize: textBuffer.length,
        config: this.currentPageConfig,
        hexData: writeBuffer.toString('hex').toUpperCase(),
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Write failed:', error.message);
      return {
        success: false,
        error: `Write failed: ${error.message}`
      };
    }
  }

  bufferToText(buffer) {
    try {
      if (!buffer || buffer.length === 0) return '';
      
      let result = '';
      for (let i = 0; i < buffer.length; i++) {
        const byte = buffer[i];
        
        // Only include printable ASCII characters
        if (byte >= 32 && byte <= 126) {
          result += String.fromCharCode(byte);
        } else if (byte === 0) {
          // Stop at null terminator
          break;
        }
      }
      
      return result.trim();
    } catch (error) {
      console.error('Error converting buffer to text:', error);
      return '';
    }
  }

  sendToRenderer(channel, data) {
    // Send to all renderer processes (in case of multiple windows)
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send(channel, data);
    });
  }

  shutdown() {
    console.log('🛑 Shutting down NFC Handler...');
    this.isInitialized = false;
  }
}

export default ElectronNFCHandler;