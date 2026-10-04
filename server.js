const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

const app = express();

const PORT = process.env.PORT || 3000;

// دومين موقعك الجديد
const ALLOWED_HOST = process.env.ALLOWED_HOST || "slanquiury-seha-sa.ct.ws";

function isAllowedUrl(targetUrl) {
  try {
    const u = new URL(targetUrl);

    if (!["http:", "https:"].includes(u.protocol)) return false;

    // إذا ما حددت ALLOWED_HOST يسمح مؤقتًا، لكن الأفضل تضيفه في Render
    if (!ALLOWED_HOST) return true;

    return u.hostname === ALLOWED_HOST || u.hostname.endsWith("." + ALLOWED_HOST);
  } catch {
    return false;
  }
}

async function getBrowser() {
  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    ignoreHTTPSErrors: true
  });
}

app.get("/", (req, res) => {
  res.send(`
    <h2>Seha PDF Service is running ✅</h2>
    <p>Use: <code>/pdf?url=https://YOUR-SITE/print_template.php?id=1</code></p>
  `);
});

app.get("/pdf", async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).send("Missing url. Example: /pdf?url=https://site.com/print_template.php?id=1");
  }

  if (!isAllowedUrl(targetUrl)) {
    return res.status(403).send("URL not allowed.");
  }

  let browser;

  try {
    browser = await getBrowser();
    const page = await browser.newPage();

    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 2
    });

    await page.goto(targetUrl, {
      waitUntil: "networkidle0",
      timeout: 60000
    });

    // انتظار تحميل الخطوط بالكامل
    await page.evaluateHandle("document.fonts.ready");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm"
      }
    });

    const fileName = "sick-leave-report.pdf";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).send("PDF generation failed: " + error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Seha PDF Service running on port ${PORT}`);
});
