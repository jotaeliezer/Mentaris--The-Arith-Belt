"use strict";

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const srcDir = path.join(root, "public");
const docsDir = path.join(root, "docs");

function ensureDir(dir){
  if(!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyDir(src, dest){
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for(const entry of entries){
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if(entry.isDirectory()){
      copyDir(srcPath, destPath);
    }else if(entry.isFile()){
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function replaceBytes(buf, search, replacement){
  let i = 0;
  const parts = [];
  while(i <= buf.length - search.length){
    if(buf.slice(i, i + search.length).equals(search)){
      parts.push(replacement);
      i += search.length;
    }else{
      parts.push(buf.slice(i, i + 1));
      i += 1;
    }
  }
  if(i < buf.length){
    parts.push(buf.slice(i));
  }
  if(parts.length === 1 && parts[0] === buf) return buf;
  return Buffer.concat(parts);
}

function listHtmlFiles(dir, out){
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for(const entry of entries){
    const fullPath = path.join(dir, entry.name);
    if(entry.isDirectory()){
      listHtmlFiles(fullPath, out);
    }else if(entry.isFile() && entry.name.toLowerCase().endsWith(".html")){
      out.push(fullPath);
    }
  }
}

copyDir(srcDir, docsDir);

const homePath = path.join(docsDir, "home.html");
const indexPath = path.join(docsDir, "index.html");
if(fs.existsSync(homePath)){
  fs.copyFileSync(homePath, indexPath);
}

const htmlFiles = [];
listHtmlFiles(docsDir, htmlFiles);
for(const filePath of htmlFiles){
  const data = fs.readFileSync(filePath);
  let updated = data;
  updated = replaceBytes(updated, Buffer.from("src=\"/"), Buffer.from("src=\""));
  updated = replaceBytes(updated, Buffer.from("href=\"/"), Buffer.from("href=\""));
  updated = replaceBytes(updated, Buffer.from("src='/"), Buffer.from("src='"));
  updated = replaceBytes(updated, Buffer.from("href='/"), Buffer.from("href='"));
  if(!updated.equals(data)){
    fs.writeFileSync(filePath, updated);
  }
}

console.log("Docs updated in", docsDir);
