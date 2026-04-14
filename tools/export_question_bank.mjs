import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";

import { build } from "esbuild";

async function main() {
  const outputArg = process.argv[2];
  const outputPath = resolve(outputArg || "tmp_question_bank_export.json");
  const tempEntryPath = resolve(`tmp_export_questions_${randomUUID()}.mjs`);
  const tempBundlePath = resolve(`tmp_export_questions_bundle_${randomUUID()}.mjs`);

  const entrySource = `
    import { questions } from "./src/data/questions.ts";
    import { availableFullTests, getFullTestQuestions } from "./src/data/fullTests.ts";

    const tests = availableFullTests.map((meta) => ({
      ...meta,
      questions: getFullTestQuestions(meta.id),
    }));

    export default {
      generatedAt: new Date().toISOString(),
      questions,
      tests,
    };
  `;

  await writeFile(tempEntryPath, entrySource, "utf8");

  try {
    await build({
      entryPoints: [tempEntryPath],
      bundle: true,
      platform: "node",
      format: "esm",
      outfile: tempBundlePath,
      logLevel: "silent",
      target: ["node22"],
    });

    const moduleUrl = `${pathToFileURL(tempBundlePath).href}?v=${Date.now()}`;
    const loaded = await import(moduleUrl);
    const payload = loaded.default;

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, JSON.stringify(payload, null, 2), "utf8");

    console.log(outputPath);
  } finally {
    await Promise.allSettled([
      import("node:fs/promises").then((fs) => fs.unlink(tempEntryPath)),
      import("node:fs/promises").then((fs) => fs.unlink(tempBundlePath)),
    ]);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
