import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { AnyRule, Config, ValidationResult } from "./types.js";

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export async function loadConfig(configPath: string): Promise<ValidationResult<Config>> {
  const res: ValidationResult<Config> = { ok: false, errors: [], warnings: [] };
  try {
    const full = path.resolve(process.cwd(), configPath);
    if (!fs.existsSync(full)) {
      res.errors.push(
        `Config file not found at ${configPath}. Create one like:\n\n` +
          sampleConfig()
      );
      return res;
    }
    const raw = fs.readFileSync(full, "utf8");
    const data = yaml.load(raw);
    if (!isObject(data)) {
      res.errors.push("Config root must be a YAML object.");
      return res;
    }
    const rulesRaw = (data["rules"] ?? null) as unknown;
    if (!Array.isArray(rulesRaw) || rulesRaw.length === 0) {
      res.errors.push("rules must be a non-empty array.");
      return res;
    }

    const rules: AnyRule[] = [];
    rulesRaw.forEach((r, idx) => {
      if (!isObject(r)) {
        res.errors.push(`rules[${idx}] must be an object.`);
        return;
      }
      const type = r["type"] as unknown;
      if (type !== "max_lines_changed" && type !== "require_ticket" && type !== "require_screenshot") {
        res.errors.push(`rules[${idx}].type must be one of: max_lines_changed, require_ticket, require_screenshot.`);
        return;
      }

      const unknownKeys = Object.keys(r).filter((k) => {
        if (type === "max_lines_changed") return !["type", "limit", "includePaths"].includes(k);
        if (type === "require_ticket") return !["type", "pattern"].includes(k);
        if (type === "require_screenshot") return !["type", "whenPaths"].includes(k);
        return true;
      });
      if (unknownKeys.length > 0) {
        res.warnings.push(`rules[${idx}]: unknown keys ignored: ${unknownKeys.join(", ")}`);
      }

      if (type === "max_lines_changed") {
        const limit = r["limit"] as unknown;
        if (typeof limit !== "number" || !Number.isFinite(limit) || limit <= 0) {
          res.errors.push(`rules[${idx}].limit must be a positive integer.`);
          return;
        }
        const includePathsRaw = r["includePaths"] as unknown;
        let includePaths: string[] | undefined;
        if (includePathsRaw !== undefined) {
          if (!Array.isArray(includePathsRaw) || !includePathsRaw.every((s) => typeof s === "string")) {
            res.errors.push(`rules[${idx}].includePaths must be an array of strings if provided.`);
            return;
          }
          includePaths = unique(includePathsRaw as string[]);
        }
        rules.push({ type: "max_lines_changed", limit: Math.floor(limit), includePaths });
      } else if (type === "require_ticket") {
        const pattern = r["pattern"] as unknown;
        if (typeof pattern !== "string" || pattern.length === 0) {
          res.errors.push(`rules[${idx}].pattern must be a non-empty string.`);
          return;
        }
        // Validate regex compiles
        try {
          // eslint-disable-next-line no-new
          new RegExp(pattern);
        } catch {
          res.errors.push(`rules[${idx}].pattern must be a valid JavaScript RegExp (without slashes).`);
          return;
        }
        rules.push({ type: "require_ticket", pattern });
      } else if (type === "require_screenshot") {
        const whenPaths = r["whenPaths"] as unknown;
        if (!Array.isArray(whenPaths) || whenPaths.length === 0 || !whenPaths.every((s) => typeof s === "string")) {
          res.errors.push(`rules[${idx}].whenPaths must be a non-empty array of strings.`);
          return;
        }
        rules.push({ type: "require_screenshot", whenPaths: unique(whenPaths as string[]) });
      }
    });

    if (res.errors.length === 0) {
      res.ok = true;
      res.value = { rules } satisfies Config;
    }
    return res;
  } catch (e: any) {
    res.errors.push(`Failed to parse config: ${e?.message ?? String(e)}`);
    return res;
  }
}

export function sampleConfig(): string {
  return `Example .github/rulekeeper.yml:\nrules:\n  - type: max_lines_changed\n    limit: 300\n  - type: require_ticket\n    pattern: "PROJ-\\d+"`;
}
