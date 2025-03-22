const { readFileSync } = require("node:fs");
const path = require("node:path");

// Simple service that prints a message every 5 seconds
function loadEnv() {
  try {
    const envPath = path.join(__dirname, "..", "env");
    const envContent = readFileSync(envPath, "utf-8");
    const message = envContent.match(/MESSAGE=(.+)/)?.[1] || "Default message";
    return message;
  } catch (error) {
    console.error("Error loading .env file:", error);
    return "Default message";
  }
}

const MESSAGE = loadEnv();
const INTERVAL = 5000;
const PREFIX = "[snodeb]";

function logMessage() {
  const timestamp = new Date().toISOString();
  console.log(`${PREFIX} [${timestamp}] ${MESSAGE}`);
}

// Print message every 5 seconds
setInterval(logMessage, INTERVAL);
logMessage(); // Initial message
