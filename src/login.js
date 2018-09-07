// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const { shell, remote, ipcRenderer } = require("electron");
const currentWindow = remote.getCurrentWindow();
const path = require("path");
const mainProcess = remote.require(path.join(__dirname, "../main.js"));
const startButton = document.querySelector("#start-sync");
const chooseDirectoryButton = document.querySelector("#chooseDirectory");
const chooseDirectoryError = document.querySelector("#choose-directory-error");
const schoolCode = document.querySelector("#school-code");
const go = document.querySelector("#go");
const log = require("electron-log");
require("./crashReporter");
let rootDir = "";
log.info("in renderer");


schoolCode.addEventListener('keypress', function (e) {
  var key = e.which || e.keyCode;
  if (key === 13) { // 13 is enter
    goLogin()
  }
});

go.addEventListener("click", event => {
  goLogin()
});

const goLogin = () => {
  go.classList.add('is-loading');
  log.info('Renderer: getting auth token');
  mainProcess.getAuthToken(currentWindow, schoolCode.value);
  log.info('got auth token')
};

startButton.addEventListener("click", event => {
  let validConfig = true;
  if (
    chooseDirectoryButton.innerHTML === "Choose Folder" ||
    chooseDirectoryButton.innerHTML === ""
  ) {
    log.error("Invalid Directory");
    showError(chooseDirectoryButton, chooseDirectoryError, "Invalid Directory");
    validConfig = false;
  }

  if (validConfig) {
    mainProcess.syncWithCanvas(
      currentWindow,
      rootDir[0]
    );
    log.info("finished sync");
  } else {
    log.error(`Invalid Configuration`);
  }
});

chooseDirectoryButton.addEventListener("click", event => {
  log.info("attempting to choose directory");
  mainProcess.chooseDirectory(currentWindow);
});

ipcRenderer.on("directory-chosen", (event, directory) => {
  chooseDirectoryButton.innerHTML = directory;
  rootDir = directory;
});

ipcRenderer.on("sync-response", (event, response) => {
  log.info(response);
  if (!response.success) {
    showError(devKey, devKeyError, response.message);
  } else {
    devKey.classList.remove("is-danger");
    devKeyError.innerHTML = "";
  }
});

ipcRenderer.on("show-notification", (event, title, body) => {
  log.info(`title:${title}`);
  log.info(`body:${body}`);

  try {
    const myNotification = new Notification(title, { body });
    if (title === "Sync Successful") {
      myNotification.onclick = () => {
        log.info("clicked on notification");
        shell.showItemInFolder(rootDir[0]);
      };
    }
  } catch (err) {
    log.error(err);
  }
});

const showError = (inputField, errorField, message) => {
  inputField.classList.add("is-danger");
  inputField.value = "";
  log.error(message);
  errorField.innerHTML = message;
};
