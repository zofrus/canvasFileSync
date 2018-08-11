// Modules to control application life and create native browser window
const { app, BrowserWindow, Menu, shell, dialog, Tray } = require("electron");
const request = require('request-promise')
const applicationMenu = require("./src/application-menus");
const path = require("path");
const moment = require("moment");
const canvasIntegration = require("./src/canvasIntegration");
const log = require("electron-log");
require("./src/crashReporter");
if (require("electron-squirrel-startup")) return;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let tray = null;
let lastSynced = new Date(canvasIntegration.storage.lastUpdated);
let connected = false;

let notConnectedMenu = [
  {
    label: "Connect",
    click() {
      createWindow();
    },
    enabled: true
  },
  {
    label: "Disconnect",
    enabled: false
  },
  {
    label: "Quit",
    click() {
      app.quit();
    },
    accelerator: "CommandOrControl+Q"
  }
];

const getUpdatedConnectedMenu = lastSynced => {
  return [
    {
      label: `Last Synced: ${moment(lastSynced).fromNow()}`,
      enabled: false
    },
    {
      label: "Disconnect",
      enabled: true,
      click() {
        disconnect();
      }
    },
    {
      label: "Quit",
      click() {
        app.quit();
      }
    }
  ];
};

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600
  });

  // and load the index.html of the app.
  mainWindow.loadFile("./src/login.html");

  // mainWindow.webContents.openDevTools();

  // Open the DevTools.
  if (process.env.debug === "true") {
    mainWindow.webContents.openDevTools();
  }

  // Emitted when the window is closed.
  mainWindow.on("closed", function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  try {
    if (app.dock) app.dock.hide();
    if (process.platform !== "darwin") {
      Menu.setApplicationMenu(null);
    } else {
      Menu.setApplicationMenu(applicationMenu);
    }
    tray = new Tray(
      path.join(__dirname, "icons_normal/icons/png/32x32@2x.png")
    );
    tray.setPressedImage(
      path.join(__dirname, "icons_inverted/icons/png/32x32@2x.png")
    );

    //handles windows
    tray.on("right-click", async () => {
      log.info("right clicked on tray");
      if (connected) {
        updateMenu(getUpdatedConnectedMenu(lastSynced));
      }
    });

    //handles mac
    tray.on("mouse-enter", async () => {
      log.info("mouse has entered area");
      if (connected) {
        updateMenu(getUpdatedConnectedMenu(lastSynced));
      }
    });

    if (canvasIntegration.isConnected()) {
      connected = true;
      updateMenu(getUpdatedConnectedMenu(lastSynced));
    } else {
      createWindow();
      updateMenu(notConnectedMenu);
    }
    let minutes = 5;
    let interval = minutes * 60 * 1000;
    setInterval(() => {
      if (connected) repeatingSyncWithCanvas();
    }, interval);
  } catch (err) {
    log.error(err);
  }
});

// Quit when all windows are closed.
app.on("window-all-closed", function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", function() {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

const chooseDirectory = (exports.chooseDirectory = targetWindow => {
  log.info("choosing directory");
  const directory = dialog.showOpenDialog({ properties: ["openDirectory"] });
  targetWindow.webContents.send("directory-chosen", directory);
});

const getAuthToken = (exports.getAuthToken = async (targetWindow, schoolCode) => {
  log.info('setting school code')
  setSchool(schoolCode)
  let schoolURL = `https://${schoolCode}.instructure.com`
  targetWindow.loadURL(schoolURL)
  let mainSession = targetWindow.webContents.session
  let longTermToken = ''

  targetWindow.on('page-title-updated', async function(event, pageTitle) {
    if (pageTitle === "Dashboard") {
      log.info('in canvas now creating auth token')
      mainSession.cookies.get({}, async (error, cookies) => {
        let authenticity_token = ''
        let canvas_session_token = ''
        let purpose = 'canvasFileSync'
        console.log(longTermToken)
        if (longTermToken === '') {
          for (let cookie of cookies) { 
            if (cookie.name === '_csrf_token') {
              authenticity_token = cookie.value
              console.log(authenticity_token)
            }
            if (cookie.name === 'canvas_session') {
              canvas_session_token = cookie.value
              console.log(canvas_session_token)
            }
          }
          var options = { 
            method: 'POST',
            url: `https://${schoolCode}.instructure.com/profile/tokens`,
            headers: 
            { 
              'Cache-Control': 'no-cache',
              'X-Requested-With': 'XMLHttpRequest',
              Accept: 'application/json, text/javascript, application/json+canvas-string-ids, */*; q=0.01',
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'X-CSRF-Token': authenticity_token,
              Cookie: `canvas_session=${canvas_session_token}; _csrf_token=${authenticity_token}` 
            },
            body: `authenticity_token=${authenticity_token}&access_token%5Bpurpose%5D=${purpose}` 
          };
  
          let response = await request(options)
          setDevKey(JSON.parse(response).visible_token) 
          targetWindow.loadFile('./src/setup.html')
          targetWindow.webContents.openDevTools();
        }
      }) 
    }
  })
});

const syncWithCanvas = (exports.syncWithCanvas = async (
  targetWindow,
  rootDir
) => {
  try {
    let syncResponse = await canvasIntegration.getCanvasCourses(
      canvasIntegration.storage.schoolCode,
      canvasIntegration.storage.developerKey
    );
    targetWindow.webContents.send("sync-response", syncResponse);
    if (syncResponse.success) {
      targetWindow.hide();
      log.info("hid window");
      let filesResponse = await canvasIntegration.getCanvasFiles(
        canvasIntegration.storage.schoolCode,
        syncResponse.response,
        rootDir
      );

      log.info("got canvas files");
      connected = true;
      updateDate();

      log.info("updated the date");

      targetWindow.webContents.send(
        "show-notification",
        `Sync Successful`,
        `Files available at ${rootDir}`
      );

      log.info("Sent notification");
      updateMenu(getUpdatedConnectedMenu(lastSynced));
    }
  } catch (err) {
    log.error(err);
  }
});

const repeatingSyncWithCanvas = async () => {
  let getCanvasCoursesResponse = await canvasIntegration.getCanvasCourses(
    canvasIntegration.storage.schoolCode,
    canvasIntegration.storage.developerKey
  );

  if (getCanvasCoursesResponse.success) {
    let filesResponse = await canvasIntegration.getCanvasFiles(
      canvasIntegration.storage.schoolCode,
      getCanvasCoursesResponse.response,
      canvasIntegration.storage.syncDir
    );

    updateDate();

    updateMenu(getUpdatedConnectedMenu(lastSynced));
  }
};

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
const updateMenu = template => {
  const menu = Menu.buildFromTemplate(template);
  tray.setContextMenu(menu);
};

const setSchool = schoolCode => {
  canvasIntegration.storage.schoolCode = schoolCode;
  canvasIntegration.saveFileMap();
}

const setDevKey = developerKey => {
  canvasIntegration.storage.developerKey = developerKey;
  canvasIntegration.saveFileMap();
}

const updateDate = () => {
  lastSynced = new Date(Date.now());
  canvasIntegration.storage.lastUpdated = lastSynced;
  canvasIntegration.saveFileMap();
};

const disconnect = () => {
  log.info("Disconnecting");
  connected = false;
  canvasIntegration.storage.syncDir = "";
  canvasIntegration.storage.files = {};
  canvasIntegration.storage.schoolCode = "";
  canvasIntegration.storage.developerKey = "";
  canvasIntegration.storage.lastUpdated = "";
  canvasIntegration.saveFileMap();
  updateMenu(notConnectedMenu);
};
