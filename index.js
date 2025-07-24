import crypto from "crypto";
import fs from "fs";
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
      default:
        console.log("Unknown command");
        exit();
    }
  }

  init() {
    if (this.args.length > 1) {
      const newDir = path.join(this.cwd, this.args[1]);

      if (!fs.existsSync(newDir)) {
        fs.mkdirSync(newDir, { recursive: true });
        this.cwd = newDir;
      } else {
        console.log("Directory already exists");
        exit();
      }
    }

    console.log(`Initializing in directory: ${this.cwd}`);

    if (!fs.existsSync(path.join(this.cwd, ".delta"))) {
      fs.mkdirSync(path.join(this.cwd, ".delta"), { recursive: true });
      this.deltaDir = path.join(this.cwd, ".delta");
      fs.writeFileSync(path.join(this.deltaDir, "index"));
      this.indexDir = path.join(this.deltaDir, "index");
      fs.writeFileSync(path.join(this.deltaDir, "HEAD"));
      this.headDir = path.join(this.deltaDir, "HEAD");
      fs.mkdirSync(path.join(this.deltaDir, "objects"), { recursive: true });
      this.objectsDir = path.join(this.deltaDir, "objects");
      console.log("Created .delta directory");
    } else {
      console.log("Repository already initialized");
      exit();
    }
  }

  hash(content) {
    return crypto.createHash("sha1").update(content, "utf-8").digest("hex");
  }

  add(file) {
    const data = fs.readFileSync(file, { encoding: "utf-8" });
    const dataHash = this.hash(data);
    const dataPath = path.join(this.objectsDir, dataHash);
    fs.writeFileSync(dataPath, data);

    console.log(`Tracking new file: ${file}`);
  }

  stage(filePath, fileHash) {
    const index = JSON.parse(fs.readFileSync());
  }
}

new Repository();
