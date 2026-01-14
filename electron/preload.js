"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  toggleFullscreen: function(){
    return ipcRenderer.invoke("toggle-fullscreen");
  },
  isFullscreen: function(){
    return ipcRenderer.invoke("is-fullscreen");
  }
});
