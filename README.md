# Wedding Photos Share Page

This repo is configured to host a shareable PDF album on GitHub Pages.

Because `weddingpix_sum.pdf` is larger than GitHub's 100 MB file limit, the site uses split parts (`weddingpix_part01.pdf`, etc.) generated from the original.

## Build The Web Files

From this folder:

```powershell
npm install
npm run split:pdf:web
```

This creates:

- `weddingpix_partNN.pdf` files (each <= ~20 MB for browser upload)
- `weddingpix_parts.json` manifest
- `index.html` viewer page

## Publish To GitHub Pages

1. Create a new GitHub repository (or use this one if already created).
2. Upload or commit these files:
   - `index.html`
   - `weddingpix_parts.json`
   - `weddingpix_part*.pdf`
   - `README.md`
   - `.gitignore`
   - `scripts/split-pdf.js`
   - `package.json` and `package-lock.json`
3. If uploading in browser, drag these files into the repo on `main` and commit.
4. In GitHub: `Settings -> Pages`.
5. Under "Build and deployment", set:
   - Source: `Deploy from a branch`
   - Branch: `main` and `/ (root)`
6. Save, then wait ~1-3 minutes for deployment.
7. Share the Pages URL shown there (typically `https://<username>.github.io/<repo>/`).

## Rebuild After Replacing Source PDF

If you update `weddingpix_sum.pdf`, rerun:

```powershell
npm run split:pdf:web
```

Then commit/push the updated `weddingpix_part*.pdf` and `weddingpix_parts.json`.

## Optional: Fewer, Larger Parts

If you prefer fewer files and plan to push via Git CLI/Desktop:

```powershell
npm run split:pdf
```

This targets ~95 MB parts (still below GitHub's 100 MB Git object limit).
