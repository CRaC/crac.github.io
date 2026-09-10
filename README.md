# crac.org

The website for the [CRaC](https://openjdk.org/projects/crac/) project —
Coordinated Restore at Checkpoint, an OpenJDK project sponsored by the HotSpot
Group. Built with Hugo, published to GitHub Pages.

**This site is about the JDK project, not about a vendor's build.** Vendor
builds are listed on [the runtimes page](content/use/crac-runtime.md), and each
vendor's own extensions to CRaC link to that vendor's documentation rather than
being restated here as though they were part of the project. In particular,
several features documented at docs.azul.com/crac — Zing usage, image
compression and encryption, S3 storage, automatic checkpoint, alternative
images — are Azul additions and are deliberately not described here as OpenJDK
CRaC features.

## Run it

```bash
hugo server
```

Then open <http://localhost:1313>. Hugo **extended** is not required; the site
uses plain CSS rather than Sass.

Search needs one more step, because Pagefind reads built HTML rather than
content files — `hugo server` alone has no index, and the search page says so
instead of failing silently:

```bash
hugo --gc --minify && npx -y pagefind@1 --site public && npx -y serve public
```

## Validation

`./test.sh` is the gate, and it is what CI runs before the deploy replaces the
live site.

```bash
./test.sh            # build, index, links, browser checks, subdirectory pass
./test.sh --fast     # same, minus the network half of the links check
```

It builds into `.gate/` and never touches `public/`, so **you can run it with
`hugo server` up**. That separation is not tidiness: `hugo server`
continuously rewrites `public/` with livereload-injected copies, so a gate that
graded `public/` would be grading whichever process wrote last.

Four layers:

1. **A clean build** into `.gate/`.
2. **`tests/links.mjs`** — every internal link resolves; every external link
   carries `target`/`rel` in the HTML rather than only after `nav.js` runs;
   every `## ` heading in a content file survived into the built page; no page
   carries a livereload script. `--remote` also asks whether the upstream URLs
   in `data/` still answer.
3. **`tests/e2e/`** — Playwright over the built output, at 1440×900 and on a
   phone viewport.
4. **The same checks again, against a build served from a subdirectory** —
   which is what GitHub Pages does for a project site. A whole class of bug is
   invisible at the root; see *Linking, at any base path* below.

The browser layer is not belt-and-braces. Everything this site can get wrong
presents as a 200 with a full-looking page: search is filled in client-side,
the menus and the table of contents only exist after JavaScript runs, and one
element wider than the viewport makes a phone scroll sideways with nothing in
the markup to say so.

Porting this harness to crac.org found six real problems in the existing
content and the new layout: three sets of dead links left over from when these
docs were flat markdown files (`STEP-BY-STEP.md`, `cpu-features.md`,
`#projects-with-crac-support` — all broken on the live site today), a code
block inside a list item overflowing on mobile, a long inline `<code>`
identifier doing the same, and markdown **images** with root-absolute paths
that 404 on a project site.

## Content

```
content/
├── _index.md                        home — laid out by layouts/home.html from data/
├── about/
│   ├── _index.md                    the project
│   ├── about-crac.md                what CRaC is, and how it works
│   └── results.md                   the measured benchmarks, and how to reproduce them
├── use/
│   ├── _index.md                    the deployment scheme
│   ├── crac-runtime.md              runtimes with CRaC support
│   ├── checkpoint-and-restore.md    taking a checkpoint, restoring from it
│   └── implement-crac.md            implementing the API
├── frameworks/                      Spring Boot, Quarkus, Micronaut, AWS Lambda
├── examples/                        Jetty, Quarkus Super Heroes
├── reference/                       best practices, debugging, fd policies, CPU features
├── search.md                        Pagefind search page
├── sitemap.md                       the human sitemap
└── 404.md
```

`content/reference/` was `content/extra-info/`. The old paths are deployed, so
each page carries an `aliases` entry and `/extra-info/…` still resolves.

### Front matter used by the layouts

| Key | Effect |
| --- | --- |
| `linkTitle` | Short label for menus, breadcrumbs and listings, where the title is long |
| `eyebrow` | Small mono label above the page title |
| `lede` | Intro paragraph in the dark page head |
| `toc` | Overrides the automatic table of contents in either direction |
| `actions` | List of `{label, url}` — buttons in the page head |
| `weight` | Order within a section listing |
| `image` | Overrides the shared-link card for this page |

### Table of contents

Automatic: a page gets one when its **content** has two or more sections.
`toc:` in front matter still wins in both directions. The rule lives in
`layouts/_partials/wants-toc.html`, and `baseof.html` asks the same partial so
`toc.js` loads exactly where a TOC is rendered.

**It counts `h2` and `h3`, because that is what `markup.tableOfContents`
renders.** Counting `h2` alone — the obvious reading — said
`/reference/debugging/` was too thin, when it has one `h2`, five `h3`s and a
six-entry table sitting there unused. Same for `/reference/best-practices/`.

Pages that still have no table of contents have **no headings**, not a missing
feature: `/frameworks/quarkus/` and the other framework pages are a few lines
each, and `/use/implement-crac/` and `/use/checkpoint-and-restore/` are under
thirty lines of prose and code. If they should have one, the fix is headings.

Two long pages did need them and got them, with wording taken from the
sentences already there rather than invented: `/examples/jetty/` was 135 lines
under a single heading, and `/use/` explained a three-stage deployment scheme
as an unheaded numbered list — which is why it had no table of contents in the
first place.

### Shortcodes

The old theme's shortcodes are reimplemented, so the content migrated without
being rewritten:

| Shortcode | Notes |
| --- | --- |
| `{{% notice %}}` | Same `style` and `title` arguments. **Percent delimiters** — its output is a block, and the angle-bracket form leaves Hugo free to drop that block inside a paragraph, taking the next section with it |
| `{{% button %}}` | Same `href`; `style` and `icon` are accepted and ignored |
| `{{% children %}}` | Lists the pages under this one, by weight |

### Vendor additions

`/use/crac-runtime/` is where the OpenJDK-versus-vendor line gets tested most,
because a reader arriving there wants to know what their runtime can do.

The engine table lists what **upstream** ships — `criuengine` and `simengine`,
both confirmed present in `openjdk/crac` — and names Azul's `warp` engine as a
vendor addition, linking to Azul's own documentation rather than restating it.
`warp` is not in `openjdk/crac`: a code search returns only a Java2D demo and
some freetype internals. `pauseengine`, which Azul documents, is likewise not
upstream.

The rule for anything added here later: **check the upstream repository before
describing an engine, flag or option as a CRaC feature.** A vendor's
documentation is a fine source for what that vendor's build does and a poor
source for what the project does.

## Data

Everything the home page states comes from `data/`, so a figure cannot drift
away from the page that also states it.

| File | Drives |
| --- | --- |
| `data/startup.yaml` | The measured benchmarks and the collapse bars |
| `data/project.yaml` | The project's identity, repositories and API version |
| `data/runtimes.yaml` | Runtimes with CRaC support, upstream first |
| `data/frameworks.yaml` | Frameworks with CRaC support, and their versions |

**Every version in `data/frameworks.yaml` is taken from that framework's own
page**, which takes it from the framework's own documentation. Nothing there is
inferred — a wrong version number in the data file is a wrong version number on
the home page. (Writing it, I first put Quarkus at 3.10.0; the page says
2.10.0.)

### The measured numbers

`data/startup.yaml` is a transcription of `static/data/startup.data` — the
project's own measurements, not estimates. They were taken on a **jdk14-crac**
build, on an Intel i7-5500U laptop, under **Linux 5.7.4**. That provenance is
rendered beside the numbers on every page that shows them, and it should stay
that way: quoted without it, "3898 ms becomes 38 ms" reads as a claim about
today's runtime on today's hardware, which it is not. The ratio is the point.

## Design

CRaC had no brand assets — no logo, no palette, and the blue on the old site
was the Relearn theme's default. So this is an identity built for the subject.
Tokens live in `assets/css/01-tokens.css` and nothing outside that file states
a colour.

Two rules run through it:

- **Colour carries meaning.** `--restore` is used only for the state after a
  restore and `--cold` only for a cold start, so neither appears anywhere it
  would not mean that. Links and buttons use an indigo instead, so "clickable"
  never reads as "this is the fast one".
- **Numbers are the personality.** Milliseconds are set in JetBrains Mono at
  display sizes, because the argument this project makes is a number getting
  smaller.

Type is **IBM Plex Sans** with **JetBrains Mono**, both self-hosted as variable
fonts in `static/fonts/` — no third-party request, so no GDPR question and no
layout shift. The wordmark is typographic: inventing a logo for a project this
site does not own would be worse than setting its name well.

### The collapse bars

`layouts/_partials/collapse-bars.html`, the one deliberately distinctive
element. One row per framework, **at true scale**, drawn from the project's own
data. At true scale a 38 ms restore beside a 3898 ms cold start is a 1% sliver,
and that sliver is the argument — the usual way this chart gets drawn is a log
axis, which makes the bars comparable and the point invisible.

Both bars are on **one** scale, the slowest cold start in the set being 100%.
Drawn the other way — each restore against its own cold start, every cold bar
full width — a 980 ms cold start looked identical to a 4352 ms one.

### Linking, at any base path

GitHub Pages serves a project site from `/<repo>/`, and the workflow passes
that through `--baseURL`. Three rules keep links working there:

- **Never write a leading slash into `relURL`, `relLangURL` or `absURL`.** Hugo
  reads it as "already absolute" and skips the base path. Prefer a page's own
  `.RelPermalink`.
- **Content and front matter may write plain paths.**
  `layouts/_partials/site-url.html` strips the slash and runs them through
  `relURL`; the markdown **link and image** render hooks and the page-head
  actions all call it.
- **CSS asset paths are relative to the stylesheet**, not the site root — the
  sheet is at `<base>/css/…`, so `url("../fonts/x.woff2")` resolves anywhere.

### Two rules that are easy to get wrong

Both of these produced a CI failure that no local run could see, because both
depended on the deploy target.

**Never decide "external" by comparing hosts.** The rule is now "the author
wrote a scheme" — `https:`, `//`, `mailto:`. Comparing against
`site.BaseURL`'s host made the answer change with `--baseURL`: crac.org links
to sibling GitHub Pages sites such as `crac.github.io/openjdk-builds/`, which
are separate sites sharing a host. Built for crac.org they were external; built
for crac.github.io the same links became internal, while `tests/links.mjs`
still expected a `target`. A rule whose answer changes with the domain will
disagree with something.

**Never compare `.RelPermalink` against a root-absolute literal.** It carries
the base path, so on a project site `.RelPermalink` is `/<repo>/search/` and a
test against `"/search/"` silently stops matching. Use `.File.Path` —
`search.md` wherever the site is served from. Four places had this: the edit
link's skip list (which is how `/search/` got an edit link in CI and not
locally), the human sitemap, `llms.txt`, and — failing silently — which pages
get the release artwork as their social card.

The subdirectory pass in `test.sh` now runs the **whole** browser suite rather
than a `--grep` subset. It had been narrowed to the specs that seemed
base-path-sensitive, which is exactly the guess that let the edit-link failure
through: there is no knowing in advance which spec a base-path bug shows up in.

## Machine-readable indexes

- **`sitemap.xml`** — Hugo's, with `/search/` and `/sitemap/` excluded.
- **`llms.txt`** — the [llmstxt.org](https://llmstxt.org/) convention, from
  `layouts/home.llms.txt`. Includes a "notes for a model" section stating the
  things that are easy to get wrong: that CRaC has to be in the runtime, that
  docs.azul.com documents Azul's builds rather than this project, and that the
  measured figures are old.
- **`index.xml`** — an RSS feed of the pages, from Hugo's default.

## The shared-link card

CRaC has no artwork, so the card is **drawn** from the measured data:
`assets/images/social-card.svg`, rendered to PNG by `scripts/social-card.sh`.
Hugo's image pipeline cannot rasterise SVG, which is why this is a script rather
than a build step. Re-run it after changing `data/startup.yaml`.

## Left to do

- **`themes/hugo-theme-relearn-7.3.2/` is dead** and can be deleted — around
  800 files. `hugo.toml` no longer names a theme.
- **`static/images/logo/`, `static/images/flow/` and `static/images/results/`
  are duplicated in `assets/`.** The `assets/` copies are the ones Hugo
  processes; the `static/` copies are still served and are what the old
  absolute paths in prose resolve to. Worth consolidating on `assets/` once
  someone has checked nothing external hotlinks the static paths.
- **The gnuplot chart on `/about/results/` uses red and blue**, which says the
  same thing as the collapse bars in different colours. Regenerating it from
  `static/data/*.plot` in the site's own palette would make the two agree.
- **`crac.org` (apex) still serves an older page** while `www.crac.org` and
  `crac.github.io` serve this site. `static/CNAME` names `www.crac.org`; the
  apex needs a DNS record or a redirect.
- **The content itself has not been reviewed** for currency. It migrated
  faithfully — I fixed links and structure, not claims — so anything that was
  out of date before still is.

## Edit this page

Every page with a source file carries an "Edit it on GitHub" link at the foot,
pointing at the markdown file behind it. It is rendered from `baseof.html`
rather than from each page template, so no template can forget it and the
placement cannot drift between sections.

Three pages deliberately do not have one, because the link would be a trap:
`/search/` and `/sitemap/` are laid out entirely by their templates and their
markdown holds nothing but front matter, and the home page is built from
`data/`. The 404 is skipped too.

`params.repo` and `params.repoBranch` in `hugo.toml` set the target, and the
branch is the one Pages deploys from — so an edit made through that link is an
edit to what the site serves. `tests/links.mjs` checks that every edit link
names a file that actually exists in the repository: a wrong prefix, or a page
whose source moved, gives a link that looks fine and lands on GitHub's 404, and
nobody clicks their own edit link often enough to notice.

**Counts are retrying assertions, always.** `expect(await x.count())` takes a
snapshot; `expect(x).not.toHaveCount(0)` and `expect(x.nth(n)).toBeAttached()`
retry. The search results are hydrated one fragment-fetch at a time *after* the
status line is set, so a snapshot count there is a race — and it fired. Some
counts in this suite are over server-rendered markup and were never racy, but
one rule means nobody has to work out which is which.

## Trademarks

Java and OpenJDK are trademarks or registered trademarks of Oracle and/or its
affiliates. Spring, Quarkus, Micronaut, Docker and AWS are trademarks of their
respective owners; their marks appear here to identify the frameworks that
integrate with CRaC.
