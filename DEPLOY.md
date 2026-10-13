# Putting the site live

This folder is a complete static website: plain HTML, CSS and JavaScript, no build step, no server code. `index.html` is the front page. Everything it uses (images, fonts, scripts, data, the three.js library, the downloads) is inside this folder and linked with relative paths, so it opens straight from disk by double-clicking `index.html`, and it works unchanged at any address.

## engineerswithai.com

The site is the repository `EngineersWithAI/EngineersWithAI.github.io`, which GitHub Pages serves at engineerswithai.com. The repository holds exactly this folder plus three small files: `.github/workflows/pages.yml` (a workflow that publishes the repository root on every push to `main`, with no build), `.gitattributes` and `.gitignore`. `CNAME` names the domain and `.nojekyll` is kept so the folder also works if Pages is ever switched to publishing the branch directly.

To update the live site, copy the changed files from this folder into your clone of the repository, then:

```
git add -A
git commit -m "Update the trebuchet site"
git push origin main
```

The workflow runs for about a minute (Actions tab), then the change is live. If the workflow ever stops running, Settings → Pages → Build and deployment → Source can be set to "Deploy from a branch" (`main`, `/ (root)`) instead; the folder needs no change for that.

The previous Engineers with AI pages (starter kit, course, community) are preserved on the branch `engineers-with-ai-site` in the same repository, with their own build script and workflow; check that branch out to bring any of it back.

## HTTPS on the domain

At the time of writing, https://engineerswithai.com answers with GitHub's generic `*.github.io` certificate, so browsers warn, while http:// works. In the repository go to Settings → Pages: the custom domain should show a green "DNS check successful" and, once GitHub has issued the certificate, the "Enforce HTTPS" box can be ticked. If the certificate never arrives, remove the custom domain, save, add it again and wait (it can take up to a day). The DNS is already right: the A records point at GitHub Pages (185.199.108–111.153) and `www` resolves too.

## Any other static host

Because every link is relative, the folder also works as it is at the root of any static host (Netlify, Cloudflare Pages, an S3 bucket, a plain web server): upload the folder's contents and open `index.html`.

## What is where

- `index.html` the story in ten stops; `proving-ground.html` the simulator; `stories.html` the thirty story cards; `engineering.html` the engineering in full; `sources.html` the sources register, downloads and image credits.
- `css/` styles and the self-hosted fonts (`fonts/`, Source Serif 4 and Archivo, SIL Open Font License).
- `js/` the page scripts; `lib/` the physics core copied from `06_simulator/` (`treb_eom.js`, `sim_core.js`, `presets.js`) and `three.min.js` (r128, MIT).
- `data/` the facts and sources used on the pages (built from `Sources_Register.xlsx`), the story cards, the machine cards, the run numbers behind the interactives, and the precomputed throws.
- `img/` photographs and manuscripts from Wikimedia Commons and open museum collections, credited on each page and listed on the Sources page; `figures/` the paper's own figures.
- `downloads/` the short report, the long draft, the sources register workbook and the BibTeX references.

## Updating numbers

The pages quote numbers from the register and from the model runs. If a run or the register changes, rebuild the data files with the scripts in `08_website/site_tools/` (see its README.md) and copy the results into `data/`. The Proving Ground's physics is `lib/sim_core.js`; if it is replaced, rerun the cross-check in `06_simulator/` first.
