// 새 글 파일을 만든다.
//   npm run new-post -- "글 제목" my-slug
// slug 를 생략하면 날짜만으로 파일 이름을 만든다 (예: 2026-11-11-post.md).

import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [title = "새 글", rawSlug = "post"] = process.argv.slice(2);
const slug = rawSlug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "post";

const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

const postsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../blog/posts");
const file = path.join(postsDir, `${date}-${slug}.md`);

if (existsSync(file)) {
  console.error(`✖ 이미 있는 파일입니다: ${path.relative(process.cwd(), file)}`);
  process.exit(1);
}

await writeFile(
  file,
  `---
title: ${title}
date: ${date}
tags: [일기]
description:
draft: true
---

여기에 글을 쓰세요. 다 쓰면 위의 \`draft: true\` 줄을 지우거나 \`false\`로 바꾸면 공개됩니다.
`,
);
console.log(`✔ 새 글을 만들었어요: ${path.relative(process.cwd(), file)}`);
