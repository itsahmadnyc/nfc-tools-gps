import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import url from 'url';
import fs from 'fs';

// ES6 equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the NFC handler synchronously
let ElectronNFCHandler;
let nfcLoadError = null;

let mainWindow;
let nfcHandler;

const createWindow = () => {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.cjs'),
      // Add these security settings
      webSecurity: false, // Simplified without isDev check
      allowRunningInsecureContent: false,
    }
  });

  // Load the app - simplified without dev server
  loadBuiltApp();

  function loadBuiltApp() {
    // Check if we're in development or production
    const isDev = !app.isPackaged;
    
    let possiblePaths;
    
    if (isDev) {
      // Development paths - relative to your project root
      possiblePaths = [
        path.join(__dirname, '../dist/index.html'),
        path.join(__dirname, '../../dist/index.html'),
        path.join(__dirname, '../build/index.html'),
        path.join(__dirname, 'dist/index.html'),
      ];
    } else {
      // Production paths - when packaged
      // In packaged app, __dirname will be inside app.asar
      // We need to go up to the resources directory and then find dist
      const resourcesPath = process.resourcesPath;
      possiblePaths = [
        path.join(resourcesPath, 'dist/index.html'),
        path.join(resourcesPath, 'app/dist/index.html'),
        path.join(resourcesPath, '../dist/index.html'),
        // Fallback to relative paths
        path.join(__dirname, '../dist/index.html'),
        path.join(__dirname, '../../dist/index.html'),
        path.join(__dirname, '../../../dist/index.html'),
      ];
    }

    let loaded = false;
    
    for (const htmlPath of possiblePaths) {
      try {
        if (fs.existsSync(htmlPath)) {
          console.log(`Loading from: ${htmlPath}`);
          
          // Method 1: Using loadFile (recommended for local files)
          mainWindow.loadFile(htmlPath);
          loaded = true;
          break;
        } else {
          console.log(`Path does not exist: ${htmlPath}`);
        }
      } catch (error) {
        console.log(`Failed to load from ${htmlPath}:`, error.message);
        continue;
      }
    }

    if (!loaded) {
      console.error('Could not find index.html in any expected location');
      console.log('Searched paths:', possiblePaths);
      console.log('Current __dirname:', __dirname);
      console.log('Process resourcesPath:', process.resourcesPath);
      console.log('App isPackaged:', app.isPackaged);
      
      // Create a simple error page
      mainWindow.loadURL(`data:text/html;charset=utf-8,
        <html>
          <head><title>Error</title></head>
          <body>
            <h1>Could not load application</h1>
            <p>Please ensure the React app is built properly.</p>
            <p>Run: npm run build (should create dist folder)</p>
            <p>Current directory: ${__dirname}</p>
            <p>Resources path: ${process.resourcesPath || 'N/A'}</p>
            <p>Is packaged: ${app.isPackaged}</p>
            <h3>Searched paths:</h3>
            <ul>
              ${possiblePaths.map(p => `<li>${p}</li>`).join('')}
            </ul>
          </body>
        </html>
      `);
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// Initialize NFC handler first, then create window
const initializeApp = async () => {
  console.log('🚀 Initializing application...');
  
  // Load NFC handler dynamically FIRST
  try {
    console.log('📦 Loading NFC Handler module...');
    const nfcModule = await import('./nfc-handler.js');
    ElectronNFCHandler = nfcModule.default;
    console.log('✅ NFC Handler module loaded successfully');
  } catch (error) {
    console.error('❌ NFC Handler not found, will continue without NFC functionality:', error.message);
    nfcLoadError = error.message;
  }
  
  // Initialize NFC handler SECOND - after loading the module
  if (ElectronNFCHandler) {
    try {
      console.log('🔧 Initializing NFC Handler...');
      nfcHandler = new ElectronNFCHandler();
      console.log('✅ NFC Handler initialized successfully');
      console.log('📋 IPC handlers should now be registered');
      
      // Verify handlers are registered by listing them
      console.log('🔍 Verifying IPC handlers are registered...');
      const { ipcMain } = await import('electron');
      const handlerNames = ['nfc-start', 'nfc-stop', 'nfc-status', 'nfc-read-page-text', 'nfc-write-page-text', 'nfc-get-card-info', 'nfc-set-page-config'];
      handlerNames.forEach(name => {
        const hasHandler = ipcMain.listenerCount(name) > 0;
        console.log(`📋 Handler '${name}': ${hasHandler ? '✅ Registered' : '❌ Missing'}`);
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize NFC Handler:', error.message);
      console.error('Stack trace:', error.stack);
      console.log('💡 Make sure nfc-pcsc is installed: npm install nfc-pcsc');
      nfcLoadError = error.message;
      // Continue without NFC functionality
    }
  } else {
    console.log('📝 Running without NFC functionality' + (nfcLoadError ? `: ${nfcLoadError}` : ''));
  }
  
  // Add fallback handlers for cases where NFC handler isn't available
  if (!nfcHandler) {
    console.log('🛡️ Setting up fallback NFC handlers...');
    const { ipcMain } = await import('electron');
    
    const fallbackResponse = {
      success: false,
      error: nfcLoadError || 'NFC functionality not available - NFC handler failed to load'
    };
    
    const nfcHandlers = [
      'nfc-start', 'nfc-stop', 'nfc-status', 'nfc-read-page-text', 
      'nfc-write-page-text', 'nfc-get-card-info', 'nfc-set-page-config'
    ];
    
    nfcHandlers.forEach(handlerName => {
      if (ipcMain.listenerCount(handlerName) === 0) {
        ipcMain.handle(handlerName, async () => {
          console.log(`⚠️ Fallback handler called for '${handlerName}' - NFC not available`);
          return fallbackResponse;
        });
        console.log(`🛡️ Fallback handler registered for '${handlerName}'`);
      }
    });
  }
  
  // Longer delay to ensure IPC handlers are fully registered
  console.log('⏳ Waiting for IPC handlers to be fully registered...');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Final verification
  console.log('🔍 Final IPC handler verification...');
  const { ipcMain } = await import('electron');
  const finalHandlerNames = ['nfc-start', 'nfc-stop', 'nfc-status', 'nfc-read-page-text', 'nfc-write-page-text', 'nfc-get-card-info', 'nfc-set-page-config'];
  const missingHandlers = finalHandlerNames.filter(name => ipcMain.listenerCount(name) === 0);
  
  if (missingHandlers.length > 0) {
    console.error('❌ Missing handlers after initialization:', missingHandlers);
  } else {
    console.log('✅ All required IPC handlers are registered');
  }
  
  // Now create the window
  console.log('🪟 Creating main window...');
  createWindow();
  
  console.log('✅ Application initialization complete');
};

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  await initializeApp();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (nfcHandler) {
      console.log('🛑 Shutting down NFC Handler...');
      nfcHandler.shutdown();
    }
    app.quit();
  }
});

app.on('before-quit', () => {
  if (nfcHandler) {
    console.log('🛑 App quitting - shutting down NFC Handler...');
    nfcHandler.shutdown();
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}