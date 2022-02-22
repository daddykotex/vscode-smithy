import * as path from "path";
import { https } from "follow-redirects";
import { IncomingMessage } from "http";
import * as fs from "fs";

export function getCoursier(
  extensionPath: string,
  versionPath: string
): Promise<string> {
  function binPath(filename: string) {
    return path.join(extensionPath, filename);
  }
  const urls = {
    darwin: `https://github.com/coursier/coursier/releases/download/${versionPath}/cs-x86_64-apple-darwin`,
    linux: `https://github.com/coursier/coursier/releases/download/${versionPath}/cs-x86_64-pc-linux`,
    win32: `https://github.com/coursier/coursier/releases/download/${versionPath}/cs-x86_64-pc-win32.exe`,
  };
  const targets = {
    darwin: binPath("coursier"),
    linux: binPath("coursier"),
    win32: binPath("coursier.exe"),
  };
  return downloadFile(urls[process.platform], targets[process.platform]);
}

function downloadFile(url: string, targetFile: string): Promise<string> {
  function promiseGet(url: string): Promise<IncomingMessage> {
    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        if (response.statusCode === 200) {
          resolve(response);
        } else {
          reject(
            new Error(
              `Server responded with ${response.statusCode}: ${response.statusMessage}`
            )
          );
        }
      });
    });
  }

  function writeToDisk(response: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(targetFile, {
        flags: "wx",
        mode: 0o755,
      });
      response.pipe(file);

      file.on("finish", () => {
        console.log(`Finished downloaded file at ${targetFile}`);
        resolve(targetFile);
      });

      file.on("error", (err) => {
        if (file) {
          file.close();
          fs.unlink(targetFile, () => {}); // Delete temp file
        }

        if (err.code === "EEXIST") {
          console.log(`File already exists at ${targetFile}`);
          resolve(targetFile);
        } else {
          console.error(`File error while downloading file at ${targetFile}`);
          console.error(err);
          reject(err);
        }
      });
    });
  }
  // adapted from https://stackoverflow.com/a/45007624
  return promiseGet(url).then((resp) => writeToDisk(resp));
}
