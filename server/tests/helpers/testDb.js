/**
 * Starts a throwaway MongoDB for integration tests, so they never touch real data.
 *
 * Looks for a local `mongod` (MONGOD_PATH, then PATH, then the usual Windows install
 * folder). If there is none, findMongod() returns null and the test file skips itself.
 */
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");

const findMongod = () => {
  const candidates = [process.env.MONGOD_PATH];

  const lookup = spawnSync(process.platform === "win32" ? "where" : "which", ["mongod"], { encoding: "utf8" });
  if (lookup.status === 0) candidates.push(lookup.stdout.split(/\r?\n/)[0]);

  const winRoot = "C:\\Program Files\\MongoDB\\Server";

  if (fs.existsSync(winRoot)) {
    for (const version of fs.readdirSync(winRoot).sort().reverse()) candidates.push(path.join(winRoot, version, "bin", "mongod.exe"));
  }

  return candidates.find((p) => p && fs.existsSync(p)) || null;
};

const freePort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });

const waitForPort = (port, tries = 80) =>
  new Promise((resolve, reject) => {
    const attempt = (left) => {
      const socket = net.connect(port, "127.0.0.1");
      socket.once("connect", () => { socket.destroy(); resolve(); });
      socket.once("error", () => {
        socket.destroy();
        if (left <= 0) reject(new Error("mongod did not start"));
        else setTimeout(() => attempt(left - 1), 250);
      });
    };
    attempt(tries);
  });

/** @returns { uri, stop() } */
const startTestDb = async (binary) => {
  const dbpath = fs.mkdtempSync(path.join(os.tmpdir(), "voyara-test-db-"));
  const port = await freePort();
  const child = spawn(binary, ["--dbpath", dbpath, "--port", String(port), "--bind_ip", "127.0.0.1"], { stdio: "ignore" });

  await waitForPort(port);

  return {
    uri: `mongodb://127.0.0.1:${port}/voyara_test`,
    stop: () =>
      new Promise((resolve) => {
        child.once("exit", () => {
          fs.rmSync(dbpath, { recursive: true, force: true });
          resolve();
        });
        child.kill();
      }),
  };
};

module.exports = { findMongod, startTestDb };
