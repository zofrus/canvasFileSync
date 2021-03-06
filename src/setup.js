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
const Store = require('electron-store');
const store = new Store();
const log = require("electron-log");
require("./crashReporter");
let rootDir = store.get("syncDir");
log.info("in setup");

startButton.addEventListener("click", event => {
  let validConfig = true;
  if (chooseDirectoryButton.innerHTML === "Choose Folder" ||
      chooseDirectoryButton.innerHTML === "") {
        log.error("Invalid Directory");
        showError(chooseDirectoryButton, chooseDirectoryError, "Invalid Directory");
        validConfig = false;
  }
  if (validConfig) {
    mainProcess.syncWithCanvas(
      currentWindow,
      rootDir
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
  rootDir = directory[0];
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
        shell.showItemInFolder(rootDir);
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