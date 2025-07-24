import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { exit } from "process";

class Repository {
  constructor() {
    this.cwd = process.cwd();
    this.args = process.argv.slice(2);

    this.deltaDir = path.join(this.cwd, ".delta");
    this.indexDir = path.join(this.deltaDir, "index");
    this.headDir = path.join(this.deltaDir, "HEAD");
    this.objectsDir = path.join(this.deltaDir, "objects");

    switch (this.args[0]) {
      case "init":
        this.init();
        break;
      case "add":
        this.add(this.args[1]);
        break;
      case "stage":
        this.stage(this.args[1]);
        break;
      case "commit":
        this.commit(this.args[1] || "New commit");
        break;
      case "log":
        this.log();
        break;
      default:
        console.log("Unknown command");
        exit();
    }
  }

  async init() {
    if (this.args.length > 1) {
      const newDir = path.join(this.cwd, this.args[1]);

      try {
        await fs.access(newDir);
        console.log("Directory already exists");
        exit();
      } catch {
        await fs.mkdir(newDir, { recursive: true });
        this.cwd = newDir;
      }
    }

    console.log(`Initializing in directory: ${this.cwd}`);

    try {
      await fs.access(path.join(this.cwd, ".delta"));
      console.log("Repository already initialized");
      exit();
    } catch {
      await fs.mkdir(path.join(this.cwd, ".delta"), { recursive: true });
      this.deltaDir = path.join(this.cwd, ".delta");
      await fs.writeFile(path.join(this.deltaDir, "index"), JSON.stringify([]));
      this.indexDir = path.join(this.deltaDir, "index");
      await fs.writeFile(path.join(this.deltaDir, "HEAD"), "", { flag: "wx" });
      this.headDir = path.join(this.deltaDir, "HEAD");
      await fs.mkdir(path.join(this.deltaDir, "objects"), { recursive: true });
      this.objectsDir = path.join(this.deltaDir, "objects");
      console.log("Created .delta directory");
    }
  }

  hash(content) {
    return crypto.createHash("sha1").update(content, "utf-8").digest("hex");
  }

  async add(file) {
    if (!file) {
      console.log("Please specify a file to add");
      exit();
    }

    const data = await fs.readFile(file, { encoding: "utf-8" });
    const dataHash = this.hash(data);
    const dataPath = path.join(this.objectsDir, dataHash);
    await fs.writeFile(dataPath, data);
    console.log(`Tracking new file: ${file}`);
    await this.updateStage(file, dataHash);
  }

  async stage(file) {
    if (!file) {
      console.log("Please specify a file to stage");
      exit();
    }

    const data = await fs.readFile(file, { encoding: "utf-8" });
    const dataHash = this.hash(data);
    const dataPath = path.join(this.objectsDir, dataHash);
    await fs.writeFile(dataPath, data);
    console.log(`Staging file: ${file}`);
    await this.updateStage(file, dataHash);
  }

  async updateStage(filePath, fileHash) {
    const index = JSON.parse(
      await fs.readFile(this.indexDir, { encoding: "utf-8" })
    );
    index.push({
      filePath: filePath,
      fileHash: fileHash,
    });
    await fs.writeFile(this.indexDir, JSON.stringify(index));
    console.log(`Updated stage for file: ${filePath}`);
  }

  async commit(message) {
    const index = JSON.parse(
      await fs.readFile(this.indexDir, { encoding: "utf-8" })
    );

    if (index.length === 0) {
      console.log("No changes to commit");
      return;
    }

    const parentCommit = await this.getCurrentHead();

    const commitData = {
      createdAt: new Date().toISOString(),
      message,
      files: index,
      parent: parentCommit,
    };

    const commitHash = this.hash(JSON.stringify(commitData));
    const commitPath = path.join(this.objectsDir, commitHash);
    await fs.writeFile(commitPath, JSON.stringify(commitData));

    await fs.writeFile(this.headDir, commitHash);
    await fs.writeFile(this.indexDir, JSON.stringify([]));

    console.log(`Committed changes with hash: ${commitHash}`);
  }

  async getCurrentHead() {
    try {
      const headContent = await fs.readFile(this.headDir, {
        encoding: "utf-8",
      });
      return headContent.trim();
    } catch (error) {
      return null;
    }
  }

  async log() {
    const headCommit = await this.getCurrentHead();
    if (!headCommit) {
      console.log("No commits found");
      return;
    }

    let currentCommit = headCommit;
    while (currentCommit) {
      const commitPath = path.join(this.objectsDir, currentCommit);
      try {
        const commitData = JSON.parse(await fs.readFile(commitPath, "utf-8"));
        console.log(`Commit: ${currentCommit}`);
        console.log(
          `Created At: ${new Date(commitData.createdAt).toLocaleString()}`
        );
        console.log(`Message: ${commitData.message}`);
        console.log(`Files:`);
        commitData.files.forEach((file) => {
          console.log(`  + ${file.filePath} (${file.fileHash})`);
        });
        console.log("-----------------------------");
        currentCommit = commitData.parent;
      } catch (error) {
        console.error(`Error reading commit ${currentCommit}:`, error);
        break;
      }
    }
  }
}

new Repository();
