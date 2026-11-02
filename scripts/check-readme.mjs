// Checks README.md (and docs/api.md links) against the code:
//   npm run check:readme              run every check
//   npm run check:readme -- --routes  print every endpoint found in the route files
// Links and images, table-of-contents anchors, npm scripts, env variables,
// endpoints, quoted versions, Mermaid diagrams, text hygiene and credentials.
// Plain Node, no dependencies. Exits 1 and lists every problem it finds.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SELF = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(SELF), "..");
const DOCS = ["README.md", "docs/api.md", "docs/ERD.md"];

const read = (file) => readFileSync(join(ROOT, file), "utf8");
const problems = {};
const fail = (check, message) => (problems[check] ??= []).push(message);
const checks = [];
const check = (name, run) => checks.push([name, run]);

/** The text outside fenced code blocks, line by line (code lines become ""). */
function proseLines(text) {
  let inFence = false;
  return text.split("\n").map((line) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return "";
    }
    return inFence ? "" : line;
  });
}

/** GitHub's heading anchors: lowercase, punctuation and emoji dropped, spaces to hyphens, duplicates numbered. */
function headingAnchors(text) {
  const seen = new Map();
  const anchors = new Set(
    [...text.matchAll(/\b(?:id|name)="([^"]+)"/g)].map(([, id]) => id),
  );
  for (const line of proseLines(text)) {
    const match = /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;
    const base = match[1]
      .replace(/<[^>]+>/g, "")
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .replace(/\s/g, "-");
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    anchors.add(count ? `${base}-${count}` : base);
  }
  return anchors;
}

/** Every endpoint the app serves, as "METHOD /api/path", read from the route files. */
function endpoints() {
  const found = new Set();
  const app = read("src/app.ts");
  for (const [, method, path] of app.matchAll(
    /app\.(get|post|put|patch|delete)\(\s*"([^"]+)"/g,
  )) {
    found.add(`${method.toUpperCase()} ${path}`);
  }
  // app.post([...paths], limiter) only adds middleware, not routes, so arrays are skipped above.
  const index = read("src/app/routes/index.ts");
  const fileOf = new Map();
  for (const [, names, file] of index.matchAll(
    /import\s*\{([^}]+)\}\s*from\s*"(\.\.\/modules\/[^"]+)\.js"/g,
  )) {
    for (const name of names
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)) {
      fileOf.set(name, join("src/app/routes", `${file}.ts`));
    }
  }
  for (const [, mount, name] of index.matchAll(
    /path:\s*"([^"]+)",\s*route:\s*(\w+)/g,
  )) {
    const file = fileOf.get(name);
    if (!file) continue;
    const source = read(file);
    const variable = new RegExp(`export const ${name} = (\\w+);`).exec(
      source,
    )?.[1];
    if (!variable) continue;
    const routes = new RegExp(
      `\\b${variable}\\.(get|post|put|patch|delete)\\(\\s*"([^"]*)"`,
      "g",
    );
    for (const [, method, path] of source.matchAll(routes)) {
      found.add(
        `${method.toUpperCase()} /api${mount}${path === "/" ? "" : path}`,
      );
    }
  }
  return found;
}

if (process.argv.includes("--routes")) {
  console.log(
    [...endpoints()]
      .sort((a, b) => a.split(" ")[1].localeCompare(b.split(" ")[1]))
      .join("\n"),
  );
  process.exit(0);
}

const docs = Object.fromEntries(DOCS.map((file) => [file, read(file)]));
const readme = docs["README.md"];
const pkg = JSON.parse(read("package.json"));

// 1. Relative links and images point at real files; in-page anchors exist.
check("links and images", () => {
  for (const [file, text] of Object.entries(docs)) {
    const prose = proseLines(text).join("\n");
    const targets = [
      ...[...prose.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map(
        ([, target]) => target,
      ),
      ...[...prose.matchAll(/\b(?:src|href)="([^"]+)"/g)].map(
        ([, target]) => target,
      ),
    ];
    for (const target of targets) {
      if (/^(https?:|mailto:)/.test(target)) continue;
      const [path, hash] = target.split("#");
      const linked = path ? join(dirname(file), decodeURI(path)) : file;
      if (path && !existsSync(join(ROOT, linked))) {
        fail("links and images", `${file}: missing ${target}`);
        continue;
      }
      if (
        hash &&
        linked.endsWith(".md") &&
        !headingAnchors(read(linked)).has(hash)
      ) {
        fail(
          "links and images",
          `${file}: ${linked} has no heading for #${hash}`,
        );
      }
    }
  }
});

// 2. Every table-of-contents entry matches a heading.
check("table of contents", () => {
  const anchors = headingAnchors(readme);
  const start = readme.indexOf("## Contents");
  if (start === -1)
    return fail("table of contents", "README.md: no Contents section");
  const toc = readme.slice(start, readme.indexOf("\n## ", start + 1));
  for (const [, anchor] of toc.matchAll(/\]\(#([^)]+)\)/g)) {
    if (!anchors.has(anchor))
      fail("table of contents", `#${anchor} has no heading`);
  }
});

// 3. Every `npm run <script>` (and `npm start`) exists in package.json.
check("npm scripts", () => {
  for (const [file, text] of Object.entries(docs)) {
    const names = [
      ...[...text.matchAll(/npm run ([\w:.-]+)/g)].map(([, name]) => name),
      ...(/\bnpm start\b/.test(text) ? ["start"] : []),
    ];
    // "`npm run lint` / `lint:fix`": the second name is a script too.
    for (const [, , second] of text.matchAll(
      /`npm run ([\w:.-]+)` \/ `([\w:.-]+)`/g,
    ))
      names.push(second);
    for (const name of new Set(names)) {
      if (!pkg.scripts?.[name])
        fail(
          "npm scripts",
          `${file}: "${name}" isn't a script in package.json`,
        );
    }
  }
});

// 4. The README's env table matches .env.example, both ways.
check("env variables", () => {
  const example = new Set(
    [...read(".env.example").matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map(
      ([, name]) => name,
    ),
  );
  const start = readme.indexOf("### Environment variables");
  const section = readme.slice(start, readme.indexOf("\n### ", start + 1));
  const inTable = [...section.matchAll(/^\| `([A-Z][A-Z0-9_]*)`\s*\|/gm)].map(
    ([, name]) => name,
  );
  const notInExample = inTable.filter((name) => !example.has(name));
  const notInReadme = [...example].filter((name) => !inTable.includes(name));
  if (!inTable.length) fail("env variables", "README.md: no env table found");
  if (notInExample.length)
    fail(
      "env variables",
      `in README but not .env.example: ${notInExample.join(", ")}`,
    );
  if (notInReadme.length)
    fail(
      "env variables",
      `in .env.example but not the README table: ${notInReadme.join(", ")}`,
    );
});

// 5. Every endpoint in the README's API table (and "METHOD /api/..." in prose) is a real route.
check("endpoints", () => {
  const served = endpoints();
  const normalize = (path) => path.replace(/:\w+/g, ":param");
  const known = new Set([...served].map(normalize));
  const listed = [
    ...[
      ...readme.matchAll(
        /^\|\s*(GET|POST|PUT|PATCH|DELETE)\s*\|\s*`([^`]+)`/gm,
      ),
    ].map(([, m, p]) => `${m} ${p}`),
    ...[
      ...readme.matchAll(/\b(GET|POST|PUT|PATCH|DELETE) (\/api\/[\w/:.-]+)/g),
    ].map(([, m, p]) => `${m} ${p}`),
  ];
  for (const endpoint of new Set(listed)) {
    if (!known.has(normalize(endpoint.split("?")[0])))
      fail("endpoints", `README.md: no route for ${endpoint}`);
  }
});

// 6. Quoted major versions match the installed packages.
check("versions", () => {
  const LIBS = {
    Express: "express",
    TypeScript: "typescript",
    Prisma: "prisma",
    Zod: "zod",
    Stripe: "stripe",
  };
  const installed = (name) => {
    try {
      return JSON.parse(read(`node_modules/${name}/package.json`)).version;
    } catch {
      return (
        pkg.dependencies?.[name] ??
        pkg.devDependencies?.[name] ??
        ""
      ).replace(/^[^\d]*/, "");
    }
  };
  const pattern = new RegExp(
    `\\b(${Object.keys(LIBS).join("|")})\\*{0,2}[ -_]v?(\\d+)\\b`,
    "g",
  );
  for (const [file, text] of Object.entries(docs)) {
    for (const [, lib, major] of text.matchAll(pattern)) {
      const actual = installed(LIBS[lib]).split(".")[0];
      if (actual !== major)
        fail("versions", `${file}: says ${lib} ${major}, installed ${actual}`);
    }
  }
  // Node: the README, .nvmrc and package.json engines agree.
  const nvm = existsSync(join(ROOT, ".nvmrc"))
    ? read(".nvmrc").trim().replace(/^v/, "").split(".")[0]
    : null;
  const engine = (pkg.engines?.node ?? "").replace(/^[^\d]*/, "").split(".")[0];
  for (const [, major] of readme.matchAll(
    /Node(?:\.js)?\*{0,2}[ -]\*{0,2}(\d+)/g,
  )) {
    if (major !== engine || (nvm && major !== nvm))
      fail(
        "versions",
        `README.md: says Node ${major}, engines ${engine}, .nvmrc ${nvm}`,
      );
  }
});

// 7. Mermaid blocks: a known diagram type first, balanced brackets and opt/alt/end.
check("mermaid", () => {
  const TYPES =
    /^(flowchart|graph|sequenceDiagram|stateDiagram(-v2)?|classDiagram|erDiagram|gantt|pie|journey|mindmap|timeline)\b/;
  for (const [file, text] of Object.entries(docs)) {
    [...text.matchAll(/^```mermaid\n([\s\S]*?)^```/gm)].forEach(
      ([, body], index) => {
        const label = `${file}: diagram ${index + 1}`;
        if (!TYPES.test(body.trim().split("\n")[0]))
          fail("mermaid", `${label} doesn't start with a diagram type`);
        const stack = [];
        const pairs = { ")": "(", "]": "[", "}": "{" };
        // Quoted labels and erDiagram cardinalities (|o--o{) aren't brackets.
        const code = body
          .replace(/"[^"\n]*"/g, '""')
          .replace(/[|}][|o]--[|o][|{]/g, "--");
        for (const char of code) {
          if ("([{".includes(char)) stack.push(char);
          else if (pairs[char] && stack.pop() !== pairs[char]) {
            fail("mermaid", `${label} has an unmatched "${char}"`);
            break;
          }
        }
        if (stack.length)
          fail("mermaid", `${label} has an unclosed "${stack.at(-1)}"`);
        const opens = (
          body.match(/^\s*(alt|opt|loop|par|critical|rect)\b/gm) ?? []
        ).length;
        const ends = (body.match(/^\s*end\s*$/gm) ?? []).length;
        if (opens !== ends)
          fail("mermaid", `${label} has ${opens} blocks but ${ends} "end"`);
      },
    );
  }
});

// 8. Text hygiene: placeholders, spelling of the name, headings and tables.
check("text", () => {
  for (const [file, text] of Object.entries(docs)) {
    const lines = proseLines(text);
    lines.forEach((line, index) => {
      const at = `${file}:${index + 1}`;
      const leftover =
        /\b(TODO|TBD|FIXME)\b|lorem|coming soon|placeholder/i.exec(line);
      if (leftover) fail("text", `${at}: leftover "${leftover[0]}"`);
      if (/\bRent\s+Nest\b|\bRentnest\b|\bRentNEST\b/.test(line))
        fail("text", `${at}: spell it "RentNest"`);
      if (/^#{1,6} /.test(line) && / {2,}|\s$/.test(line.replace(/^#+ /, "")))
        fail("text", `${at}: extra spaces in a heading`);
      if (line.startsWith("|") && line.includes("\t"))
        fail("text", `${at}: tab in a table`);
    });
    const cells = (line) =>
      line
        .replace(/`[^`]*`/g, "code")
        .replace(/\\\|/g, "")
        .replace(/^\||\|$/g, "")
        .split("|").length;
    let columns = null;
    lines.forEach((line, index) => {
      if (!line.trim().startsWith("|")) return void (columns = null);
      const count = cells(line.trim());
      if (columns === null) columns = count;
      else if (count !== columns)
        fail(
          "text",
          `${file}:${index + 1}: table row has ${count} columns, expected ${columns}`,
        );
    });
  }
});

/** A small .gitignore matcher (names and `*` globs, `!` exceptions), for files that never reach the repo. */
function gitignored() {
  const rules = read(".gitignore")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const negate = line.startsWith("!");
      const glob = line.replace(/^!/, "").replace(/^\/|\/$/g, "");
      const source = glob
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, "[^/]*");
      return { negate, pattern: new RegExp(`(^|/)${source}(/|$)`) };
    });
  return (file) =>
    rules.reduce(
      (ignored, rule) => (rule.pattern.test(file) ? !rule.negate : ignored),
      false,
    );
}

// 9. No admin or landlord credentials in the docs, Postman collection or .env.example.
// (prisma/seed.ts creates the demo landlords for local databases, so it's not scanned.)
check("credentials", () => {
  const banned = new RegExp(
    ["admin", "landlord\\d*"].map((user) => `${user}@rentnest\\.`).join("|") +
      "|Admin@" +
      "123",
    "i",
  );
  const ignored = gitignored();
  const files = ["README.md", ".env.example"];
  const walk = (dir) => {
    for (const name of readdirSync(join(ROOT, dir))) {
      const file = join(dir, name);
      if (statSync(join(ROOT, file)).isDirectory()) walk(file);
      else if (/\.(md|json|sql|txt)$/.test(name)) files.push(file);
    }
  };
  walk("docs");
  for (const file of files) {
    if (
      ignored(file) ||
      relative(ROOT, join(ROOT, file)) === relative(ROOT, SELF)
    )
      continue;
    read(file)
      .split("\n")
      .forEach(
        (line, index) =>
          banned.test(line) && fail("credentials", `${file}:${index + 1}`),
      );
  }
  // The landlord login in the Postman collection must not reuse the public tenant password.
  const postman = read("docs/RentNest.postman_collection.json");
  if (/\{\{landlordEmail\}\}[^}]*\{\{demoPassword\}\}/.test(postman)) {
    fail(
      "credentials",
      "docs/RentNest.postman_collection.json: landlord login uses the public demo password",
    );
  }
});

for (const [name, run] of checks) run(name);

const failed = Object.keys(problems);
for (const [name] of checks) {
  console.log(`${failed.includes(name) ? "✗" : "✓"} ${name}`);
  for (const message of problems[name] ?? []) console.log(`    ${message}`);
}
console.log(
  `\n${checks.length - failed.length}/${checks.length} checks passed.`,
);
process.exit(failed.length ? 1 : 0);
