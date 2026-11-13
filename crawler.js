
const { chromium } = require('playwright');

async function crawlWebsite({
    websiteURL,
    browser = 'Chrome',
    maxPages = 30,
    maxDepth = 4,
    includeExternalLinks = false
}) {

    const browserInstance = await chromium.launch({
        headless: true
    });

    const context = await browserInstance.newContext();
    const page = await context.newPage();

    const visited = new Set();
    const queue = [{ url: websiteURL, depth: 0 }];
    const websiteData = [];

    const baseURL = new URL(websiteURL);
    const baseDomain = baseURL.hostname;

    try {
        while (queue.length > 0 && visited.size < maxPages) {

            const current = queue.shift();

            if (visited.has(current.url)) continue;

            visited.add(current.url);

            try {
                console.log('Crawling:', current.url);

                await page.goto(current.url, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });

                await page.waitForTimeout(1000);

                // Extract page information
                const pageData = await page.evaluate(() => {

                    const elements = [];

                    document.querySelectorAll(
                        'a, button, input, select, textarea, form'
                    ).forEach(element => {

                        elements.push({
                            tag: element.tagName.toLowerCase(),
                            type: element.getAttribute('type'),
                            text: element.innerText?.trim() || '',
                            name: element.getAttribute('name'),
                            id: element.id || '',
                            placeholder: element.getAttribute('placeholder'),
                            href: element.getAttribute('href'),
                            required: element.required || false
                        });

                    });

                    return {
                        title: document.title,
                        url: window.location.href,
                        html: document.documentElement.outerHTML,
                        elements
                    };

                });

                websiteData.push({
                    depth: current.depth,
                    ...pageData
                });

                // Discover internal links
                if (current.depth < maxDepth) {

                    const links = await page.locator('a[href]').evaluateAll(
                        anchors => anchors.map(a => a.href)
                    );

                    for (const link of links) {

                        try {
                            const parsedURL = new URL(link);

                            const sameDomain =
                                parsedURL.hostname === baseDomain;

                            if (
                                (sameDomain || includeExternalLinks) &&
                                !visited.has(parsedURL.href) &&
                                !queue.some(item => item.url === parsedURL.href)
                            ) {
                                parsedURL.hash = '';

                                queue.push({
                                    url: parsedURL.href,
                                    depth: current.depth + 1
                                });
                            }

                        } catch (error) {
                            // Ignore invalid links
                        }
                    }
                }

            } catch (error) {
                console.error('Page failed:', current.url, error.message);

                websiteData.push({
                    url: current.url,
                    depth: current.depth,
                    error: error.message
                });
            }
        }

        return {
            totalPages: websiteData.length,
            pages: websiteData
        };

    } finally {
        await browserInstance.close();
    }
}

module.exports = { crawlWebsite };
