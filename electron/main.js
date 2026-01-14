"use strict";

const path = require("path");
const { app, BrowserWindow, Menu, ipcMain } = require("electron");

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
app.commandLine.appendSwitch("force_high_performance_gpu");
app.commandLine.appendSwitch("disable-renderer-backgrounding");

let mainWindow = null;

function createWindow(){
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: "#05060f",
    fullscreen: true,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      sandbox: false,
      autoplayPolicy: "no-user-gesture-required"
    }
  });

  Menu.setApplicationMenu(null);
  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadFile(path.join(__dirname, "..", "public", "home.html"));

  mainWindow.on("closed", function(){
    mainWindow = null;
  });
}

ipcMain.handle("toggle-fullscreen", function(){
  if(!mainWindow) return false;
  mainWindow.setFullScreen(!mainWindow.isFullScreen());
  mainWindow.setMenuBarVisibility(false);
  return mainWindow.isFullScreen();
});

ipcMain.handle("is-fullscreen", function(){
  if(!mainWindow) return false;
  return mainWindow.isFullScreen();
});

app.whenReady().then(createWindow);

app.on("window-all-closed", function(){
  if(process.platform !== "darwin") app.quit();
});

app.on("activate", function(){
  if(BrowserWindow.getAllWindows().length === 0) createWindow();
});
