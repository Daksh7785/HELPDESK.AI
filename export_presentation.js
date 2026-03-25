const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    console.log("Launching Puppeteer...");
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Load local file
    const filePath = 'file://' + path.join(__dirname, 'docs', 'slides.html');
    console.log(`Loading HTML from: ${filePath}`);
    
    await page.goto(filePath, {
        waitUntil: 'networkidle2',
        timeout: 30000 
    });

    // Wait an extra second just to make sure any chart animations finish
    await new Promise(r => setTimeout(r, 1000));

    const outputPath = path.join(__dirname, 'helpdesk_v3.pdf');
    console.log(`Generating Perfect PDF: ${outputPath}`);

    await page.pdf({
        path: outputPath,
        width: '1280px',
        height: '720px',
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    await browser.close();
    console.log("Success! PDF created.");
})();
