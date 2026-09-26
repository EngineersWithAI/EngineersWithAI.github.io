#!/usr/bin/env python3
"""Build engineerswithai.com.

Reads Markdown pages from content/, data from data/*.yml, Jinja2 templates from
templates/, copies static/ unchanged, and writes the finished site to public/.

    python build.py            build into public/
    python build.py --strict   also fail when a page listed in data/course.yml has no content file
    python build.py --serve    build, then serve public/ at http://localhost:8000

README.md explains how content, data, and templates fit together. DESIGN.md is the
design contract and WRITING.md is the writing guide.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import http.server
import posixpath
import re
import shutil
import sys
from dataclasses import dataclass, field
from functools import partial
from html.parser import HTMLParser
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import unquote, urljoin, urlsplit

import markdown
import yaml
from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape
from markupsafe import Markup

ROOT = Path(__file__).resolve().parent
CONTENT = ROOT / "content"
DATA = ROOT / "data"
TEMPLATES = ROOT / "templates"
STATIC = ROOT / "static"
PUBLIC = ROOT / "public"

# Site-wide settings. Change URLs here, not in templates.
SITE = {
    "name": "Engineers with AI",
    "url": "https://engineerswithai.com",
    "domain": "engineerswithai.com",
    "description": (
        "Free course and templates that teach engineering students to use AI well in their own field, "
        "from aerospace to manufacturing."
    ),
    "github": "https://github.com/EngineersWithAI",
    # The site's own source repository. Points at the organization until the repository name is settled.
    "source": "https://github.com/EngineersWithAI",
}

# Header navigation: (section, label, url). The section is the first part of the URL path.
NAV = [
    ("starter-kit", "Starter Kit", "/starter-kit/"),
    ("course", "Course", "/course/"),
    ("community", "Community", "/community/"),
]

# Starter Kit pages in reading order, used for the footer. Pages that don't exist are left out.
STARTER_KIT_ORDER = [
    "/starter-kit/semester-hq/",
    "/starter-kit/course-projects/",
    "/starter-kit/my-week/",
    "/starter-kit/context-log/",
    "/starter-kit/workflow-examples/",
    "/starter-kit/know-when-its-wrong/",
]

# Description for the course overview if content/course/index.md doesn't exist.
GENERATED_DESCRIPTIONS = {
    "/course/": "A course that takes engineering students from no experience with AI to industry-ready in their own field.",
}

MD_EXTENSIONS = [
    "extra",
    "toc",
    "admonition",
    "pymdownx.details",
    "pymdownx.superfences",
    "pymdownx.highlight",
    "pymdownx.inlinehilite",
    "pymdownx.arithmatex",
    "pymdownx.tasklist",
    "sane_lists",
    "smarty",
]
MD_CONFIG = {
    # Footnote ids like "fn-1" instead of "fn:1", and a text link back instead of a glyph.
    "extra": {"footnotes": {"SEPARATOR": "-", "BACKLINK_TEXT": "Back to text"}},
    "toc": {"permalink": False},
    "pymdownx.highlight": {"use_pygments": True, "css_class": "highlight", "pygments_lang_class": True},
    "pymdownx.arithmatex": {"generic": True},
    "pymdownx.tasklist": {"custom_checkbox": False, "clickable_checkbox": True},
}


class Report:
    """Collects build errors (which fail the build) and warnings (which don't)."""

    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)


# ---------------------------------------------------------------------------
# Data model


@dataclass
class Entry:
    """A page slot defined in data/course.yml. It may or may not have a content file yet."""

    url: str
    kind: str  # overview, section, page
    title: str  # h1 and <title>
    nav_label: str  # text in the course sidebar
    ref: str  # text in breadcrumbs and previous/next links
    group: str | None = None  # the section id
    number: str | None = None  # optional label shown before the title in the sidebar, e.g. "1.2"
    hours: float | None = None
    summary: str | None = None
    progress: bool = False  # gets an "I've finished this" checkbox
    generated: bool = False  # built from data even without a content file
    page: "Page | None" = None

    @property
    def exists(self) -> bool:
        return self.page is not None


@dataclass
class Page:
    url: str
    src: Path | None = None
    meta: dict = field(default_factory=dict)
    body: str = ""
    title: str = ""
    description: str = ""
    layout: str = "page"
    entry: Entry | None = None
    html: str = ""
    toc: list = field(default_factory=list)
    has_math: bool = False
    breadcrumbs: list = field(default_factory=list)
    meta_line: str = ""
    prev: "Entry | SimpleNamespace | None" = None
    next: "Entry | SimpleNamespace | None" = None
    noindex: bool = False

    @property
    def out_path(self) -> Path:
        if self.url.endswith(".html"):
            return PUBLIC / self.url.lstrip("/")
        return PUBLIC / self.url.lstrip("/") / "index.html"

    @property
    def section(self) -> str | None:
        first = self.url.strip("/").split("/")[0]
        return first if first in {n[0] for n in NAV} else None

    @property
    def rel_src(self) -> str:
        return str(self.src.relative_to(ROOT)) if self.src else f"(generated {self.url})"


# ---------------------------------------------------------------------------
# Loading


FRONT_MATTER_RE = re.compile(r"\A---[ \t]*\n(.*?)\n---[ \t]*(?:\n|\Z)", re.S)


def url_for_source(rel: Path) -> str:
    parts = list(rel.with_suffix("").parts)
    if parts[-1] == "index":
        parts = parts[:-1]
    if parts == ["404"]:
        return "/404.html"
    return "/" + "".join(part + "/" for part in parts)


def source_for_url(url: str) -> str:
    """The content file a URL expects, for messages."""
    path = url.strip("/")
    if not path:
        return "content/index.md"
    if url in COURSE_INDEX_URLS:
        return f"content/{path}/index.md"
    return f"content/{path}.md"


COURSE_INDEX_URLS: set[str] = set()  # filled by build_course: URLs whose file is <folder>/index.md


def load_yaml(name: str, report: Report) -> dict:
    path = DATA / name
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        report.error(f"data/{name} is missing")
        return {}
    except yaml.YAMLError as exc:
        report.error(f"data/{name}: invalid YAML: {exc}")
        return {}
    return data or {}


def load_pages(report: Report) -> dict[str, Page]:
    pages: dict[str, Page] = {}
    if not CONTENT.is_dir():
        report.error("content/ folder is missing")
        return pages
    for src in sorted(CONTENT.rglob("*.md")):
        rel = src.relative_to(CONTENT)
        if any(part.startswith((".", "_")) for part in rel.parts):
            continue  # drafts and hidden files
        text = src.read_text(encoding="utf-8").lstrip("﻿")
        match = FRONT_MATTER_RE.match(text)
        meta: dict = {}
        body = text
        if match:
            try:
                meta = yaml.safe_load(match.group(1)) or {}
            except yaml.YAMLError as exc:
                report.error(f"content/{rel}: invalid front matter: {exc}")
                continue
            if not isinstance(meta, dict):
                report.error(f"content/{rel}: front matter must be a set of key: value pairs")
                continue
            body = text[match.end():]
        url = url_for_source(rel)
        if url in pages:
            report.error(f"content/{rel} and {pages[url].rel_src} both build {url}")
            continue
        title = str(meta.get("title") or "").strip()
        if not title:
            report.error(f"content/{rel}: missing front-matter title")
        description = str(meta.get("description") or "").strip()
        if not description:
            report.warn(f"content/{rel}: no front-matter description")
        elif len(description) > 160:
            report.warn(f"content/{rel}: description is {len(description)} characters (keep it under 160)")
        layout = str(meta.get("layout") or ("home" if url == "/" else "course" if url.startswith("/course/") else "page"))
        if layout not in {"home", "page", "course"}:
            report.error(f"content/{rel}: unknown layout '{layout}' (use home, page, or course)")
            layout = "page"
        pages[url] = Page(
            url=url,
            src=src,
            meta=meta,
            body=body,
            title=title or "Untitled",
            description=description or SITE["description"],
            layout=layout,
            noindex=url == "/404.html",
        )
    return pages


# ---------------------------------------------------------------------------
# Course structure


class Course:
    """The course structure from data/course.yml: an overview page, then sections of pages in reading order."""

    def __init__(self, data: dict, report: Report) -> None:
        self.data = data
        self.entries: dict[str, Entry] = {}
        self.sequence: list[Entry] = []  # reading order for previous/next links
        self.overview: Entry | None = None
        self.sections: list[dict] = []  # [{"id", "label", "entries", "overview", "data"}]
        self._report = report
        try:
            self._build(data)
        except (KeyError, TypeError) as exc:
            report.error(f"data/course.yml: missing or malformed field ({exc})")

    def _add(self, entry: Entry, index_file: bool = False) -> Entry:
        if entry.url in self.entries:
            self._report.error(f"data/course.yml: two pages share the URL {entry.url}")
        self.entries[entry.url] = entry
        if index_file:
            COURSE_INDEX_URLS.add(entry.url)
        return entry

    def _build(self, data: dict) -> None:
        self.overview = self._add(
            Entry(url="/course/", kind="overview", title=str(data.get("title") or "Course"),
                  nav_label="Course overview", ref="Course overview", generated=True),
            index_file=True,
        )
        self.sequence.append(self.overview)
        for section in data.get("sections") or []:
            section_id = str(section["id"])
            if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", section_id):
                self._report.error(f"data/course.yml: section id '{section_id}' must be lowercase letters, numbers, and hyphens")
                continue
            base = f"/course/{section_id}/"
            title = str(section["title"])
            overview = self._add(
                Entry(url=base, kind="section", title=title, nav_label="Overview", ref=title, group=section_id,
                      hours=section.get("hours"), summary=section.get("summary"), generated=True),
                index_file=True,
            )
            items = [overview]
            for item in section.get("pages") or []:
                slug = str(item["slug"])
                number = item.get("number")
                items.append(self._add(Entry(
                    url=f"{base}{slug}/", kind="page", title=str(item["title"]), nav_label=str(item["title"]),
                    ref=(f"{number} {item['title']}" if number else str(item["title"])), group=section_id,
                    number=str(number) if number is not None else None, hours=item.get("hours"),
                    summary=item.get("summary"), progress=True,
                )))
            self.sequence.extend(items)
            self.sections.append({"id": section_id, "label": title, "entries": items, "overview": overview,
                                  "data": section})

    def section_entries(self, section_id: str) -> list[Entry]:
        for section in self.sections:
            if section["id"] == section_id:
                return section["entries"]
        return []


# ---------------------------------------------------------------------------
# Formatting helpers used by build code and templates


def fmt_number(value) -> str:
    value = float(value)
    return str(int(value)) if value.is_integer() else f"{value:g}"


def hours_text(hours) -> str:
    if hours is None:
        return ""
    if hours < 1:
        return f"About {round(hours * 60)} minutes"
    if hours == 1:
        return "About 1 hour"
    return f"About {fmt_number(hours)} hours"


def strip_tags(fragment: str) -> str:
    return re.sub(r"<[^>]+>", "", fragment).strip()


# ---------------------------------------------------------------------------
# Markdown


def new_markdown() -> markdown.Markdown:
    return markdown.Markdown(extensions=MD_EXTENSIONS, extension_configs=MD_CONFIG, output_format="html")


INLINE_MD = markdown.Markdown(extensions=["smarty", "attr_list"], output_format="html")


def md_inline(text) -> Markup:
    """Render a short Markdown string (from front matter) without the wrapping paragraph."""
    INLINE_MD.reset()
    rendered = INLINE_MD.convert(str(text or "")).strip()
    match = re.fullmatch(r"<p>(.*)</p>", rendered, re.S)
    return Markup(match.group(1) if match else rendered)


POSTING_TEMPLATE_RE = re.compile(r"^\[\[posting-template:\s*([a-z0-9-]+)\s*\]\][ \t]*$", re.M)
COMMUNITY_HREF_RE = re.compile(r'href="community:([a-z0-9-]*)"')
ANSWERS_RE = re.compile(r'(<details class="success"[^>]*>\s*<summary>)Success(</summary>)')
TASK_RE = re.compile(r'<input type="checkbox"( checked)?\s*/?>\s*(.*?)(?=</p>|</li>|<ul|<ol|<div|<p>)', re.S)
TABLE_RE = re.compile(r"<table>.*?</table>", re.S)
ROW_RE = re.compile(r"<tr>(.*?)</tr>", re.S)
CELL_RE = re.compile(r"<(th|td)((?:\s[^>]*)?)>(.*?)</\1>", re.S)
NUMERIC_RE = re.compile(r"[+\-−]?(?:\d{1,3}(?:,\d{3})+|\d+|(?=\.\d))(?:\.\d+)?(?:[eE][+\-−]?\d+)?\s?%?")
LINK_RE = re.compile(r'<a href="([^"]*)"([^>]*)>(.*?)</a>', re.S)
H2_RE = re.compile(r'<h2 id="([^"]+)"[^>]*>(.*?)</h2>', re.S)
HEADING_RE = re.compile(r"<h([1-6])[\s>]")


def expand_posting_templates(body: str, boards: dict, page: Page, report: Report) -> str:
    """Replace a line [[posting-template: <board id>]] with that board's template from data/community.yml."""

    def replace(match: re.Match) -> str:
        board = boards.get(match.group(1))
        if not board:
            report.error(f"{page.rel_src}: unknown community board '{match.group(1)}' in posting-template")
            return match.group(0)
        return "```text\n" + str(board.get("template", "")).rstrip("\n") + "\n```"

    return POSTING_TEMPLATE_RE.sub(replace, body)


def fix_tables(fragment: str) -> str:
    """Wrap tables for horizontal scrolling, right-align numeric columns, and swap inline styles for classes."""

    def fix(match: re.Match) -> str:
        table = match.group(0)
        body = table.split("<tbody>", 1)[1] if "<tbody>" in table else ""
        numeric: dict[int, bool] = {}
        for row in ROW_RE.findall(body):
            for index, cell in enumerate(CELL_RE.finditer(row)):
                text = html.unescape(strip_tags(cell.group(3))).strip()
                if not text:
                    continue
                numeric[index] = numeric.get(index, True) and bool(NUMERIC_RE.fullmatch(text))
        numeric_columns = {i for i, is_numeric in numeric.items() if is_numeric}

        def fix_row(row_match: re.Match) -> str:
            index = 0

            def fix_cell(cell: re.Match) -> str:
                nonlocal index
                tag, attrs, content = cell.groups()
                align = re.search(r'style="text-align:\s*(left|right|center);?"', attrs)
                attrs = re.sub(r'\s*style="text-align:\s*\w+;?"', "", attrs)
                css = None
                if align:
                    css = {"right": "num", "center": "align-center"}.get(align.group(1))
                elif index in numeric_columns:
                    css = "num"
                if css:
                    attrs += f' class="{css}"'
                if tag == "th" and "scope=" not in attrs:
                    attrs += ' scope="col"'
                index += 1
                return f"<{tag}{attrs}>{content}</{tag}>"

            return "<tr>" + CELL_RE.sub(fix_cell, row_match.group(1)) + "</tr>"

        return '<div class="table-wrap">' + ROW_RE.sub(fix_row, table) + "</div>"

    return TABLE_RE.sub(fix, fragment)


def fix_task_lists(fragment: str) -> str:
    """Give each task-list checkbox a label so it has an accessible name."""
    return TASK_RE.sub(
        lambda m: f'<label class="task-label"><input type="checkbox"{" checked" if m.group(1) else ""}> '
                  f"{m.group(2).rstrip()}</label>",
        fragment,
    )


def normalize_path(path: str) -> str:
    """Add the trailing slash to a page path that has no file extension."""
    last = path.rsplit("/", 1)[-1]
    if path and not path.endswith("/") and "." not in last:
        return path + "/"
    return path


def unwrap_pending_links(fragment: str, pending: set, page: Page, report: Report) -> str:
    """Links to course pages that are planned but not written yet become plain text (non-strict builds)."""
    unwrapped: list[str] = []

    def unwrap(match: re.Match) -> str:
        href = html.unescape(match.group(1))
        if not href.startswith("/"):
            return match.group(0)
        path = normalize_path(urlsplit(href).path)
        if path in pending:
            if path not in unwrapped:
                unwrapped.append(path)
            return match.group(3)
        return match.group(0)

    fragment = LINK_RE.sub(unwrap, fragment)
    if unwrapped:
        report.warn(f"{page.rel_src}: {len(unwrapped)} link(s) shown as plain text until the page exists: "
                    + ", ".join(unwrapped))
    return fragment


def check_heading_order(fragment: str, page: Page, report: Report) -> None:
    previous = 1  # the template's h1
    for match in HEADING_RE.finditer(fragment):
        level = int(match.group(1))
        if level == 1:
            report.error(f"{page.rel_src}: don't use a level-1 heading (#); the template prints the title")
        elif level > previous + 1:
            report.warn(f"{page.rel_src}: heading level jumps from h{previous} to h{level}")
        previous = level


# ---------------------------------------------------------------------------
# Link checking


class HTMLScan(HTMLParser):
    """Collects ids, links, and h1 count from a built page."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.links: list[tuple[str, int]] = []
        self.h1 = 0

    def handle_starttag(self, tag: str, attrs: list) -> None:
        attributes = dict(attrs)
        if attributes.get("id"):
            self.ids.append(attributes["id"])
        if tag == "h1":
            self.h1 += 1
        for name in ("href", "src"):
            value = attributes.get(name)
            if value is not None:
                self.links.append((value, self.getpos()[0]))

    handle_startendtag = handle_starttag


def resolve_output(path: str) -> Path | None:
    """Map a URL path to the file in public/ that serves it."""
    clean = posixpath.normpath(unquote(path))
    if clean.startswith(".."):
        return None
    target = PUBLIC / clean.lstrip("/")
    if path.endswith("/") or target.is_dir():
        target = target / "index.html"
    return target if target.is_file() else None


def check_links(pages: list[Page], report: Report) -> None:
    scans: dict[Path, HTMLScan] = {}

    def scan(path: Path) -> HTMLScan:
        if path not in scans:
            parser = HTMLScan()
            parser.feed(path.read_text(encoding="utf-8"))
            scans[path] = parser
        return scans[path]

    for page in pages:
        out = page.out_path
        info = scan(out)
        where = str(out.relative_to(PUBLIC))
        if info.h1 != 1:
            report.error(f"{where}: has {info.h1} h1 elements (needs exactly one)")
        seen: set[str] = set()
        for element_id in info.ids:
            if element_id in seen:
                report.error(f"{where}: duplicate id '{element_id}'")
            seen.add(element_id)
        for href, line in info.links:
            if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", href) or href.startswith("//"):
                continue  # external (https:, mailto:, data:)
            if href == "#" or href == "":
                report.error(f"{where}:{line}: empty link target '{href}'")
                continue
            if href.startswith("#"):
                if unquote(href[1:]) not in seen:
                    report.error(f"{where}:{line}: link to missing anchor {href}")
                continue
            absolute = urljoin(page.url, href)
            parts = urlsplit(absolute)
            target = resolve_output(parts.path)
            if target is None:
                report.error(f"{where}:{line}: broken link {href}")
                continue
            if not href.startswith("/"):
                report.warn(f"{where}:{line}: relative link {href} (use a path starting with /)")
            elif parts.path != normalize_path(parts.path):
                report.warn(f"{where}:{line}: link {href} should end with a slash")
            if parts.fragment and target.suffix == ".html":
                if unquote(parts.fragment) not in scan(target).ids:
                    report.error(f"{where}:{line}: link {href} points to an anchor that doesn't exist")


# ---------------------------------------------------------------------------
# The build


class Builder:
    def __init__(self, strict: bool) -> None:
        self.strict = strict
        self.report = Report()
        self.md = new_markdown()

    # -- data ---------------------------------------------------------------

    def load(self) -> None:
        report = self.report
        self.course_data = load_yaml("course.yml", report)
        self.community = load_yaml("community.yml", report)
        self.boards = {board["id"]: board for board in self.community.get("boards") or []}
        self.course = Course(self.course_data, report)
        self.pages = load_pages(report)

    # -- course pages -------------------------------------------------------

    def attach_course_pages(self) -> None:
        course, report = self.course, self.report
        for url, entry in course.entries.items():
            page = self.pages.get(url)
            if page is None and entry.generated:
                page = Page(url=url, title=entry.title, layout="course",
                            description=GENERATED_DESCRIPTIONS.get(url, SITE["description"]))
                self.pages[url] = page
            if page is None:
                continue
            page.entry = entry
            page.layout = "course"
            entry.page = page
            # Titles come from course.yml; front matter should match it.
            if page.src is not None and entry.kind != "overview":
                given = page.meta.get("title")
                if given and str(given).strip() != entry.title:
                    report.warn(f"{page.rel_src}: title '{given}' differs from course.yml ('{entry.title}')")
            if entry.kind != "overview" or page.src is None:
                page.title = entry.title

        self.pending = {url for url, entry in course.entries.items() if not entry.exists}
        if self.pending:
            message = (f"{len(self.pending)} page(s) listed in data/course.yml have no content file yet; "
                       "they show in navigation as '(coming soon)':")
            detail = "\n".join(f"    {source_for_url(url)}" for url in sorted(self.pending, key=self.sequence_key))
            (report.error if self.strict else report.warn)(message + "\n" + detail)

        for url, page in self.pages.items():
            if url.startswith("/course/") and page.entry is None:
                report.warn(f"{page.rel_src}: not listed in data/course.yml, so it isn't in the course navigation")

    def sequence_key(self, url: str):
        order = list(self.course.entries)
        return order.index(url) if url in order else len(order)

    def course_context(self, page: Page) -> None:
        """Breadcrumbs, the meta line, and previous/next links for a course page."""
        entry, course = page.entry, self.course
        crumbs = []
        if page.url != "/course/":
            crumbs.append({"label": "Course", "url": "/course/"})
        if entry and entry.kind == "page":
            parent = course.section_entries(entry.group)[0]
            crumbs.append({"label": parent.title, "url": parent.url})
        page.breadcrumbs = crumbs

        if entry:
            parts = []
            if entry.kind == "page" and entry.number:
                parts.append(entry.number)
            if entry.hours:
                parts.append(hours_text(entry.hours))
            page.meta_line = " · ".join(parts)

            if entry in course.sequence:
                existing = [e for e in course.sequence if e.exists]
                if entry in existing:
                    i = existing.index(entry)
                    page.prev = existing[i - 1] if i > 0 else None
                    page.next = existing[i + 1] if i + 1 < len(existing) else None

    def generated_html(self, page: Page) -> str:
        """HTML the templates add after a course page's own content: the list of pages in a section,
        or the list of sections on the course overview."""
        entry = page.entry
        if entry is None:
            return ""
        if entry.kind == "section":
            items = [e for e in self.course.section_entries(entry.group) if e is not entry]
            return self.render("partials/section_list.html", items=items)
        if entry.kind == "overview" and self.course.sections:
            return self.render("partials/course_sections.html", sections=self.course.sections)
        return ""

    def footer_columns(self) -> list[dict]:
        def link(url: str, label: str | None = None):
            page = self.pages.get(url)
            return {"url": url, "label": label or (page.title if page else url)} if page else None

        course = [link("/course/", "Course overview")]
        course += [link(sec["overview"].url, sec["label"]) for sec in self.course.sections]
        kit = [link("/starter-kit/", "Starter Kit overview")] + [link(url) for url in STARTER_KIT_ORDER]
        community = [link("/community/", "Community overview")]
        if "/community/" in self.pages:
            community += [{"url": f"/community/#{b['id']}", "label": b["name"]} for b in self.boards.values()]
        if self.community.get("discussions_url"):
            community.append({"url": self.community["discussions_url"], "label": "GitHub Discussions"})
        return [
            {"title": "Course", "links": [l for l in course if l]},
            {"title": "Starter Kit", "links": [l for l in kit if l]},
            {"title": "Community", "links": [l for l in community if l]},
        ]

    # -- rendering ------------------------------------------------------------

    def setup_templates(self) -> None:
        self.env = Environment(
            loader=FileSystemLoader(str(TEMPLATES)),
            autoescape=select_autoescape(["html", "xml"]),
            trim_blocks=True,
            lstrip_blocks=True,
            undefined=StrictUndefined,
        )
        self.env.filters["md_inline"] = md_inline
        self.env.filters["hours"] = hours_text
        self.env.globals.update(site=SITE, nav=NAV, course=self.course, community=self.community)

    def render(self, template: str, **context) -> str:
        return self.env.get_template(template).render(**context)

    def render_content(self, page: Page) -> None:
        report = self.report
        body = expand_posting_templates(page.body, self.boards, page, report)
        self.md.reset()
        fragment = self.md.convert(body)
        check_heading_order(fragment, page, report)

        def community_href(match: re.Match) -> str:
            target = match.group(1)
            url = self.boards[target]["url"] if target in self.boards else (
                self.community.get("discussions_url") if target == "discussions" else None)
            if not url:
                report.error(f"{page.rel_src}: unknown community link 'community:{target}'")
                return match.group(0)
            return f'href="{html.escape(url)}"'

        fragment = COMMUNITY_HREF_RE.sub(community_href, fragment)
        fragment = ANSWERS_RE.sub(r"\1Show answers\2", fragment)
        fragment = fix_task_lists(fragment)
        fragment = fix_tables(fragment)
        if not self.strict:
            fragment = unwrap_pending_links(fragment, self.pending, page, report)
        if page.layout == "course":
            fragment += self.generated_html(page)
        page.html = fragment
        page.has_math = 'class="arithmatex"' in fragment
        page.toc = [{"id": m.group(1), "text": Markup(strip_tags(m.group(2)))} for m in H2_RE.finditer(fragment)]
        if len(page.toc) < 2:
            page.toc = []

    def standard_breadcrumbs(self, page: Page) -> list[dict]:
        crumbs = []
        parts = page.url.strip("/").split("/")
        for i in range(1, len(parts)):
            url = "/" + "/".join(parts[:i]) + "/"
            parent = self.pages.get(url)
            if parent:
                crumbs.append({"label": parent.title, "url": url})
        return crumbs

    def write_page(self, page: Page, assets: dict) -> None:
        context = {"page": page, "assets": assets, "footer": self.footer_columns()}
        if page.layout == "home":
            template = "home.html"
        elif page.layout == "course":
            current_group = page.entry.group if page.entry else None
            context.update(current_group=current_group)
            template = "course.html"
        else:
            template = "page.html"
        out = page.out_path
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(self.render(template, **context), encoding="utf-8")

    def check_home(self, page: Page) -> None:
        for key in ("intro", "parts"):
            if not page.meta.get(key):
                self.report.error(f"{page.rel_src}: the home layout needs '{key}' in the front matter")

    # -- main -----------------------------------------------------------------

    def run(self) -> bool:
        report = self.report
        self.load()
        self.setup_templates()
        self.attach_course_pages()

        kit_order = [url for url in ["/starter-kit/"] + STARTER_KIT_ORDER if url in self.pages]
        for page in self.pages.values():
            if page.layout == "course":
                self.course_context(page)
            else:
                page.breadcrumbs = self.standard_breadcrumbs(page)
            if page.url in kit_order:
                i = kit_order.index(page.url)
                link = lambda url: SimpleNamespace(url=url, ref=self.pages[url].title)
                page.prev = link(kit_order[i - 1]) if i > 0 else None
                page.next = link(kit_order[i + 1]) if i + 1 < len(kit_order) else None
            if page.layout == "home":
                self.check_home(page)
            self.render_content(page)

        if PUBLIC.exists():
            shutil.rmtree(PUBLIC)
        shutil.copytree(STATIC, PUBLIC)
        assets = {name: hashlib.sha256((STATIC / path).read_bytes()).hexdigest()[:10]
                  for name, path in {"css": "css/site.css", "js": "js/site.js", "math": "js/math.js"}.items()}

        pages = sorted(self.pages.values(), key=lambda p: p.url)
        for page in pages:
            self.write_page(page, assets)
        if "/404.html" not in self.pages:
            report.error("content/404.md is missing (GitHub Pages serves public/404.html for unknown URLs)")

        (PUBLIC / "CNAME").write_text(SITE["domain"] + "\n", encoding="utf-8")
        (PUBLIC / "robots.txt").write_text(
            f"User-agent: *\nAllow: /\n\nSitemap: {SITE['url']}/sitemap.xml\n", encoding="utf-8")
        urls = "".join(f"  <url><loc>{html.escape(SITE['url'] + p.url)}</loc></url>\n"
                       for p in pages if not p.noindex)
        (PUBLIC / "sitemap.xml").write_text(
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "</urlset>\n",
            encoding="utf-8")

        check_links(pages, report)
        for warning in report.warnings:
            print(f"warning: {warning}", file=sys.stderr)
        for error in report.errors:
            print(f"error: {error}", file=sys.stderr)
        status = "failed" if report.errors else "ok"
        print(f"Build {status}: {len(pages)} pages in public/, "
              f"{len(report.errors)} error(s), {len(report.warnings)} warning(s).")
        return not report.errors


# ---------------------------------------------------------------------------
# Local preview server


class PreviewHandler(http.server.SimpleHTTPRequestHandler):
    """Serves public/ and answers unknown paths with 404.html, like GitHub Pages."""

    def send_head(self):
        path = self.translate_path(self.path)
        if not Path(path).exists() or (Path(path).is_dir() and not (Path(path) / "index.html").exists()):
            not_found = PUBLIC / "404.html"
            if not_found.is_file():
                body = not_found.read_bytes()
                self.send_response(404)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                if self.command == "HEAD":
                    return None
                self.wfile.write(body)
                return None
        return super().send_head()


def serve(port: int) -> None:
    handler = partial(PreviewHandler, directory=str(PUBLIC))
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as server:
        print(f"Serving public/ at http://localhost:{port}/ (Ctrl+C to stop)")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build engineerswithai.com into public/.")
    parser.add_argument("--strict", action="store_true",
                        help="fail when a page listed in data/course.yml has no content file")
    parser.add_argument("--serve", action="store_true", help="serve public/ after building")
    parser.add_argument("--port", type=int, default=8000, help="port for --serve (default 8000)")
    args = parser.parse_args(argv)
    ok = Builder(strict=args.strict).run()
    if args.serve:
        serve(args.port)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
