# engineerswithai.com

The public website for **Engineers with AI** (*AI on your belt*): a free toolkit and a new community for engineers who want to use AI well inside their own discipline.

It's a plain static site with no build step, no framework, and no tracking. Edit the files, commit, and push to `main`, and GitHub Pages redeploys in a minute or two.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole site (one page) |
| `styles.css` | All styling, with light and dark mode |
| `404.html` | Shown for any page that doesn't exist |
| `fonts/` | Self-hosted IBM Plex Sans and Mono, under the SIL Open Font License (license files included) |
| `favicon.svg`, `favicon.ico`, `apple-touch-icon.png` | Icons |
| `og-image.png` | The preview image shown when the link is shared |
| `robots.txt`, `sitemap.xml` | For search engines |
| `CNAME` | Tells GitHub Pages to serve the site at engineerswithai.com. GitHub creates it when the custom domain is set. |
| `.nojekyll` | Serve files as-is, without GitHub's Jekyll build |

## Preview locally

Open `index.html` in a browser, or run `python -m http.server` in this folder and go to <http://localhost:8000>.

## Hosting

GitHub Pages from the `main` branch (repo root) of `EngineersWithAI/EngineersWithAI.github.io`.

The DNS for engineerswithai.com is managed at the registrar (1st Domains), under Manage DNS Zone Records:

| Type | Host | Value |
| --- | --- | --- |
| A | *(blank)* | 185.199.108.153 |
| A | *(blank)* | 185.199.109.153 |
| A | *(blank)* | 185.199.110.153 |
| A | *(blank)* | 185.199.111.153 |
| AAAA | *(blank)* | 2606:50c0:8000::153 |
| AAAA | *(blank)* | 2606:50c0:8001::153 |
| AAAA | *(blank)* | 2606:50c0:8002::153 |
| AAAA | *(blank)* | 2606:50c0:8003::153 |
| CNAME | www | engineerswithai.github.io |

Don't add wildcard (`*`) records; GitHub warns they open the door to domain takeovers.
