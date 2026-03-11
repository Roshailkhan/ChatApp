const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const localDir = path.join(__dirname, ".local");
const escapedLocal = localDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const localPattern = new RegExp(`^${escapedLocal}`);

const existingBlockList = config.resolver.blockList;
if (Array.isArray(existingBlockList)) {
  config.resolver.blockList = [...existingBlockList, localPattern];
} else if (existingBlockList) {
  config.resolver.blockList = [existingBlockList, localPattern];
} else {
  config.resolver.blockList = [localPattern];
}

module.exports = config;
