// 룰렛 앱과 Markdown 블로그를 하나의 정적 사이트(_site/)로 만든다.
//
//   _site/                  ← 룰렛 앱 (index.html, app.js, design/)
//   _site/blog/             ← 글 목록
//   _site/blog/<slug>/      ← 글 하나
//   _site/blog/tags/<tag>/  ← 태그별 글 목록
//   _site/blog/feed.xml     ← RSS (SITE_URL 환경변수가 있을 때 절대 주소 사용)
//
// 모든 링크는 상대 경로라서 https://<id>.github.io/<저장소>/ 같은 하위 경로에서도 동작한다.

import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Marked } from "marked";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "_site");
const BLOG_SRC = path.join(ROOT, "blog");
const POSTS_SRC = path.join(BLOG_SRC, "posts");
const BLOG_OUT = path.join(OUT, "blog");

const BLOG_TITLE = "오늘 뭐 했지?";
const BLOG_DESCRIPTION = "룰렛이 골라준 하루를 기록하는 블로그";
const SITE_URL = (process.env.SITE_URL || "").replace(/\/+$/, "");
const INCLUDE_DRAFTS = process.argv.includes("--drafts");

// 룰렛 앱 파일 (사이트 루트로 그대로 복사)
const APP_FILES = ["index.html", "app.js", "design"];

// ---------------------------------------------------------------------------
// 도우미
// ---------------------------------------------------------------------------

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatDate = (date) =>
  `${date.getUTCFullYear()}년 ${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일`;

const isoDate = (date) => date.toISOString().slice(0, 10);

const tagSlug = (tag) => encodeURIComponent(tag.trim().toLowerCase().replace(/\s+/g, "-"));

/** 맨 위 `---` 사이의 `키: 값` 줄을 읽는다. tags 는 [a, b] 또는 a, b 형식 모두 허용. */
function parseFrontMatter(source, file) {
  const match = source.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: {}, body: source };

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx === -1) throw new Error(`${file}: front matter 줄을 읽을 수 없습니다 → "${line}"`);
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    data[key] = value;
  }
  return { data, body: source.slice(match[0].length) };
}

function parseTags(raw) {
  if (!raw) return [];
  return raw
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((tag) => tag.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function createMarkdown(prefix) {
  // 글 안의 상대 경로 이미지(images/a.png)를 글 페이지 위치에 맞게 고친다.
  const marked = new Marked({ gfm: true });
  marked.use({
    walkTokens(token) {
      if (token.type === "image" && !/^(?:[a-z]+:|\/|#|\.\.\/)/i.test(token.href)) {
        token.href = prefix + token.href.replace(/^\.\//, "");
      }
    },
  });
  return marked;
}

// ---------------------------------------------------------------------------
// 글 읽기
// ---------------------------------------------------------------------------

async function loadPosts() {
  if (!existsSync(POSTS_SRC)) return [];
  const files = (await readdir(POSTS_SRC)).filter((name) => name.endsWith(".md"));
  const markdown = createMarkdown("../");
  const posts = [];

  for (const file of files) {
    const source = await readFile(path.join(POSTS_SRC, file), "utf8");
    const { data, body } = parseFrontMatter(source, file);

    if (data.draft === "true" && !INCLUDE_DRAFTS) continue;

    const base = file.replace(/\.md$/, "");
    const datePrefix = base.match(/^(\d{4}-\d{2}-\d{2})-?/);
    const slug = data.slug || (datePrefix ? base.slice(datePrefix[0].length) : base) || base;
    const date = new Date(data.date || (datePrefix && datePrefix[1]) || Date.now());
    if (Number.isNaN(date.getTime())) throw new Error(`${file}: date 값이 올바르지 않습니다 → "${data.date}"`);

    const html = markdown.parse(body);
    const firstParagraph = body
      .split(/\r?\n\s*\r?\n/)
      .map((block) => block.trim())
      .find((block) => block && !/^(#|!\[|```|>|[-*] |\d+\. |<)/.test(block));
    const description =
      data.description || (firstParagraph ? firstParagraph.replace(/[*_`[\]]|\(.*?\)/g, "").slice(0, 120) : "");

    posts.push({
      file,
      slug,
      title: data.title || slug,
      date,
      description,
      tags: parseTags(data.tags),
      draft: data.draft === "true",
      html,
    });
  }

  const slugs = new Set();
  for (const post of posts) {
    if (slugs.has(post.slug)) throw new Error(`slug 가 겹칩니다: "${post.slug}" (${post.file})`);
    slugs.add(post.slug);
  }

  return posts.sort((a, b) => b.date - a.date || a.title.localeCompare(b.title));
}

// ---------------------------------------------------------------------------
// HTML 템플릿
// ---------------------------------------------------------------------------

function layout({ title, description, root, body }) {
  // root: 이 페이지에서 _site/blog/ 까지의 상대 경로 ("", "../", "../../")
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#FFD200" />
    <meta name="description" content="${escapeHtml(description)}" />
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="${root}style.css" />
    <link rel="alternate" type="application/rss+xml" title="${escapeHtml(BLOG_TITLE)}" href="${root}feed.xml" />
  </head>
  <body>
    <header class="site-header">
      <a class="site-header__title" href="${root}index.html">${escapeHtml(BLOG_TITLE)}</a>
      <nav class="site-header__nav" aria-label="사이트">
        <a href="${root}index.html">글 목록</a>
        <a href="${root}../index.html">🎡 룰렛 돌리기</a>
      </nav>
    </header>
    <main class="site-main">
${body}
    </main>
    <footer class="site-footer">
      <p>Markdown으로 쓰고 GitHub Actions로 배포했어요.</p>
    </footer>
  </body>
</html>
`;
}

function tagList(tags, root) {
  if (!tags.length) return "";
  const items = tags
    .map((tag) => `<li><a class="tag" href="${root}tags/${tagSlug(tag)}/index.html">#${escapeHtml(tag)}</a></li>`)
    .join("");
  return `<ul class="tag-list">${items}</ul>`;
}

function postCards(posts, root) {
  if (!posts.length) return `<p class="empty">아직 글이 없어요. <code>blog/posts/</code>에 첫 글을 써 보세요!</p>`;
  return `<ol class="post-list">
${posts
  .map(
    (post) => `  <li class="post-card">
    <time datetime="${isoDate(post.date)}">${formatDate(post.date)}</time>
    <h2><a href="${root}${encodeURIComponent(post.slug)}/index.html">${escapeHtml(post.title)}</a>${post.draft ? ' <span class="draft">초안</span>' : ""}</h2>
    ${post.description ? `<p>${escapeHtml(post.description)}</p>` : ""}
    ${tagList(post.tags, root)}
  </li>`,
  )
  .join("\n")}
</ol>`;
}

function renderIndex(posts, allTags) {
  const tagCloud = allTags.length
    ? `<nav class="tag-cloud" aria-label="태그">${tagList(allTags.map(([tag]) => tag), "")}</nav>`
    : "";
  return layout({
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    root: "",
    body: `      <section class="hero">
        <h1>${escapeHtml(BLOG_TITLE)}</h1>
        <p>${escapeHtml(BLOG_DESCRIPTION)}</p>
      </section>
      ${tagCloud}
      ${postCards(posts, "")}`,
  });
}

function renderPost(post, prev, next) {
  const link = (p, label) =>
    p ? `<a href="../${encodeURIComponent(p.slug)}/index.html"><span>${label}</span>${escapeHtml(p.title)}</a>` : "<span></span>";
  return layout({
    title: `${post.title} | ${BLOG_TITLE}`,
    description: post.description || BLOG_DESCRIPTION,
    root: "../",
    body: `      <article class="post">
        <header class="post__header">
          <time datetime="${isoDate(post.date)}">${formatDate(post.date)}</time>
          <h1>${escapeHtml(post.title)}</h1>
          ${tagList(post.tags, "../")}
        </header>
        <div class="post__body">
${post.html}
        </div>
      </article>
      <nav class="post-nav" aria-label="이전 글과 다음 글">
        ${link(next, "← 이전 글")}
        ${link(prev, "다음 글 →")}
      </nav>`,
  });
}

function renderTag(tag, posts) {
  return layout({
    title: `#${tag} | ${BLOG_TITLE}`,
    description: `#${tag} 태그가 붙은 글`,
    root: "../../",
    body: `      <section class="hero hero--small">
        <h1>#${escapeHtml(tag)}</h1>
        <p>${posts.length}개의 글</p>
      </section>
      ${postCards(posts, "../../")}`,
  });
}

function renderFeed(posts) {
  const base = SITE_URL ? `${SITE_URL}/blog/` : "";
  const items = posts
    .slice(0, 20)
    .map(
      (post) => `    <item>
      <title>${escapeHtml(post.title)}</title>
      <link>${base}${encodeURIComponent(post.slug)}/</link>
      <guid>${base}${encodeURIComponent(post.slug)}/</guid>
      <pubDate>${post.date.toUTCString()}</pubDate>
      <description>${escapeHtml(post.description)}</description>
    </item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeHtml(BLOG_TITLE)}</title>
    <link>${base}</link>
    <description>${escapeHtml(BLOG_DESCRIPTION)}</description>
    <language>ko</language>
${items}
  </channel>
</rss>
`;
}

// ---------------------------------------------------------------------------
// 빌드
// ---------------------------------------------------------------------------

async function write(file, content) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
}

async function build() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(BLOG_OUT, { recursive: true });

  for (const entry of APP_FILES) {
    await cp(path.join(ROOT, entry), path.join(OUT, entry), { recursive: true });
  }
  await write(path.join(OUT, ".nojekyll"), "");

  await cp(path.join(BLOG_SRC, "style.css"), path.join(BLOG_OUT, "style.css"));
  const imagesSrc = path.join(POSTS_SRC, "images");
  if (existsSync(imagesSrc)) await cp(imagesSrc, path.join(BLOG_OUT, "images"), { recursive: true });

  const posts = await loadPosts();

  const tagMap = new Map();
  for (const post of posts) {
    for (const tag of post.tags) {
      const key = tagSlug(tag);
      if (!tagMap.has(key)) tagMap.set(key, [tag, []]);
      tagMap.get(key)[1].push(post);
    }
  }
  const allTags = [...tagMap.values()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  await write(path.join(BLOG_OUT, "index.html"), renderIndex(posts, allTags));
  await write(path.join(BLOG_OUT, "feed.xml"), renderFeed(posts));

  for (const [i, post] of posts.entries()) {
    await write(path.join(BLOG_OUT, post.slug, "index.html"), renderPost(post, posts[i - 1], posts[i + 1]));
  }
  for (const [key, [tag, tagged]] of tagMap) {
    await write(path.join(BLOG_OUT, "tags", decodeURIComponent(key), "index.html"), renderTag(tag, tagged));
  }

  console.log(`✔ _site/ 생성 완료 — 글 ${posts.length}개, 태그 ${tagMap.size}개${INCLUDE_DRAFTS ? " (초안 포함)" : ""}`);
}

build().catch((error) => {
  console.error(`✖ 빌드 실패: ${error.message}`);
  process.exit(1);
});
