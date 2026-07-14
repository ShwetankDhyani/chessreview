import type { ReactNode } from "react";
import { createElement, Fragment } from "react";

/**
 * Small safe markdown subset → React nodes (no HTML passthrough).
 * Supports: headings, paragraphs, bold/italic, links, images, lists, quotes, code.
 */

function plain(s: string) {
  return s;
}

function inline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re =
    /(!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) {
      nodes.push(plain(text.slice(last, m.index)));
    }
    const k = `${keyBase}-${i++}`;
    if (m[1].startsWith("![")) {
      nodes.push(
        createElement("img", {
          key: k,
          src: m[3],
          alt: m[2] || "",
          className:
            "my-4 w-full max-h-[28rem] object-cover rounded-xl border border-chess-border",
          loading: "lazy",
        })
      );
    } else if (m[1].startsWith("[")) {
      nodes.push(
        createElement(
          "a",
          {
            key: k,
            href: m[5],
            className: "text-chess-accent underline underline-offset-2 hover:opacity-90",
            target: "_blank",
            rel: "noopener noreferrer",
          },
          m[4]
        )
      );
    } else if (m[1].startsWith("**")) {
      nodes.push(createElement("strong", { key: k, className: "text-chess-text font-semibold" }, m[6]));
    } else if (m[1].startsWith("*")) {
      nodes.push(createElement("em", { key: k }, m[7]));
    } else {
      nodes.push(
        createElement(
          "code",
          {
            key: k,
            className:
              "rounded bg-chess-bg/80 border border-chess-border/60 px-1 py-0.5 font-mono text-[0.85em] text-chess-accent",
          },
          m[8]
        )
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(plain(text.slice(last)));
  return nodes;
}

export function renderBlogMarkdown(md: string): ReactNode {
  const lines = String(md ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push(
        createElement(
          "pre",
          {
            key: key++,
            className:
              "my-4 overflow-x-auto rounded-xl border border-chess-border bg-chess-bg/70 p-3 text-xs font-mono text-chess-subtext",
            "data-lang": lang || undefined,
          },
          createElement("code", null, buf.join("\n"))
        )
      );
      continue;
    }

    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^#+/)?.[0].length ?? 1;
      const text = line.replace(/^#{1,3}\s+/, "");
      const Tag = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
      const cls =
        level === 1
          ? "text-xl font-bold text-chess-text mt-6 mb-3"
          : level === 2
            ? "text-lg font-bold text-chess-text mt-5 mb-2"
            : "text-base font-semibold text-chess-text mt-4 mb-2";
      blocks.push(createElement(Tag, { key: key++, className: cls }, inline(text, `h${key}`)));
      i += 1;
      continue;
    }

    if (line.startsWith("> ")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        buf.push(lines[i].slice(2));
        i += 1;
      }
      blocks.push(
        createElement(
          "blockquote",
          {
            key: key++,
            className:
              "my-4 border-l-2 border-chess-accent/50 pl-3 text-chess-subtext italic",
          },
          buf.map((b, bi) =>
            createElement("p", { key: bi, className: "mb-1 last:mb-0" }, inline(b, `q${key}-${bi}`))
          )
        )
      );
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i += 1;
      }
      blocks.push(
        createElement(
          "ul",
          {
            key: key++,
            className: "my-3 list-disc pl-5 space-y-1 text-chess-subtext",
          },
          items.map((item, ii) =>
            createElement("li", { key: ii }, inline(item, `li${key}-${ii}`))
          )
        )
      );
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith(">") &&
      !lines[i].startsWith("```") &&
      !/^[-*]\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }
    blocks.push(
      createElement(
        "p",
        { key: key++, className: "my-3 text-sm sm:text-[15px] leading-relaxed text-chess-subtext" },
        inline(para.join(" "), `p${key}`)
      )
    );
  }

  return createElement(Fragment, null, blocks);
}
