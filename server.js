const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");

const app = express();

const PORT = process.env.PORT || 3000;

// السماح للنطاقات مباشرة عبر مصفوفة ثابتة مع دعم المتغيرات
const ALLOWED_HOSTS = [
  "slanquiury-seha-sa.ct.ws",
  "slanquiury-seha-sa.fwh.is",
  "lepilortds.infy.click",
  ...(process.env.ALLOWED_HOSTS ? process.env.ALLOWED_HOSTS.split(",").map(h => h.trim()) : [])
];

function isAllowedUrl(targetUrl) {
  try {
    const u = new URL(targetUrl);

    if (!["http:", "https:"].includes(u.protocol)) {
      return false;
    }

    return ALLOWED_HOSTS.includes(u.hostname);
  } catch {
    return false;
  }
}

async function getBrowser() {
  return puppeteer.launch({
    args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    ignoreHTTPSErrors: true
  });
}

app.get("/", (req, res) => {
  res.send(`
    <h2>Seha PDF Service is running ✅</h2>
    <p>Use: <code>/pdf?url=https://YOUR-SITE/public_report.php?id=1</code></p>
  `);
});

app.get("/pdf", async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).send(
      "Missing url. Example: /pdf?url=https://site.com/public_report.php?id=1"
    );
  }

  if (!isAllowedUrl(targetUrl)) {
    return res.status(403).send("URL not allowed.");
  }

  let browser;

  try {
    browser = await getBrowser();

    const page = await browser.newPage();

    // إضافة User-Agent حقيقي لتخطي فحص حماية استضافة InfinityFree
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 2
    });

    await page.goto(targetUrl, {
      waitUntil: "networkidle2",
      timeout: 60000
    });

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

    const reportId = req.query.id || Date.now();
    const fileName = `sickleave-${reportId}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

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
