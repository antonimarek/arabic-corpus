import {
  mkdir,
  readdir,
  readFile,
  writeFile,
  access,
} from "node:fs/promises";
import path from "node:path";

import {
  decisionsFileSchema,
  importRunMetaSchema,
  stagingCandidateSchema,
  type DecisionsFile,
  type ImportRunMeta,
  type ReviewDecision,
  type StagingCandidate,
} from "./schema";

export type StagingStore = {
  listRuns(): Promise<ImportRunMeta[]>;
  getRun(importRunId: string): Promise<ImportRunMeta | null>;
  getCandidates(importRunId: string): Promise<StagingCandidate[]>;
  getDecisions(importRunId: string): Promise<DecisionsFile | null>;
  writeRun(
    meta: ImportRunMeta,
    candidates: StagingCandidate[],
  ): Promise<void>;
  setDecision(
    importRunId: string,
    stagingId: string,
    decision: ReviewDecision,
    note?: string,
  ): Promise<void>;
};

function repoRoot(): string {
  return process.cwd();
}

export function defaultImportPaths(root = repoRoot()) {
  return {
    root,
    staging: path.join(root, "import", "staging"),
    reports: path.join(root, "import", "reports"),
    processed: path.join(root, "import", "processed"),
    normalized: path.join(root, "import", "normalized"),
    raw: path.join(root, "raw"),
  };
}

export function createFilesystemStagingStore(
  stagingRoot?: string,
): StagingStore {
  // Statically scoped under import/staging for bundler tracing.
  const root =
    stagingRoot ?? path.join(process.cwd(), "import", "staging");

  async function runDir(importRunId: string) {
    return path.join(/*turbopackIgnore: true*/ root, importRunId);
  }

  return {
    async listRuns() {
      try {
        await access(root);
      } catch {
        return [];
      }
      const entries = await readdir(/*turbopackIgnore: true*/ root, {
        withFileTypes: true,
      });
      const runs: ImportRunMeta[] = [];
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const meta = await this.getRun(entry.name);
        if (meta) runs.push(meta);
      }
      return runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    },

    async getRun(importRunId) {
      try {
        const raw = await readFile(
          path.join(await runDir(importRunId), "run.json"),
          "utf8",
        );
        return importRunMetaSchema.parse(JSON.parse(raw));
      } catch {
        return null;
      }
    },

    async getCandidates(importRunId) {
      try {
        const raw = await readFile(
          path.join(await runDir(importRunId), "candidates.jsonl"),
          "utf8",
        );
        const lines = raw.split("\n").filter((line) => line.trim().length > 0);
        return lines.map((line) =>
          stagingCandidateSchema.parse(JSON.parse(line)),
        );
      } catch {
        return [];
      }
    },

    async getDecisions(importRunId) {
      try {
        const raw = await readFile(
          path.join(await runDir(importRunId), "decisions.json"),
          "utf8",
        );
        return decisionsFileSchema.parse(JSON.parse(raw));
      } catch {
        return null;
      }
    },

    async writeRun(meta, candidates) {
      const dir = await runDir(meta.importRunId);
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(dir, "run.json"),
        `${JSON.stringify(meta, null, 2)}\n`,
        "utf8",
      );
      const jsonl = candidates
        .map((c) => JSON.stringify(c))
        .join("\n");
      await writeFile(
        path.join(dir, "candidates.jsonl"),
        jsonl ? `${jsonl}\n` : "",
        "utf8",
      );
    },

    async setDecision(importRunId, stagingId, decision, note) {
      const dir = await runDir(importRunId);
      await mkdir(dir, { recursive: true });
      const filePath = path.join(dir, "decisions.json");
      let current: DecisionsFile = {
        importRunId,
        updatedAt: new Date().toISOString(),
        decisions: {},
      };
      try {
        const raw = await readFile(filePath, "utf8");
        current = decisionsFileSchema.parse(JSON.parse(raw));
      } catch {
        // new file
      }
      const now = new Date().toISOString();
      current.updatedAt = now;
      current.decisions[stagingId] = {
        decision,
        updatedAt: now,
        ...(note ? { note } : {}),
      };
      await writeFile(
        filePath,
        `${JSON.stringify(current, null, 2)}\n`,
        "utf8",
      );
    },
  };
}
