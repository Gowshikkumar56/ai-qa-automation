
const express = require('express');
const { crawlWebsite } = require('./crawler');

const app = express();

app.use(express.json({ limit: '2mb' }));

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'running',
        service: 'AI QA Automation - Playwright Crawler'
    });
});

// Website crawling API
app.post('/crawl', async (req, res) => {
    try {
        const {
            projectName,
            testCase,
            browser,
            websiteURL,
            maxPages = 30,
            maxDepth = 4,
            includeExternalLinks = false
        } = req.body;

        if (!websiteURL) {
            return res.status(400).json({
                error: 'websiteURL is required'
            });
        }

        const result = await crawlWebsite({
            websiteURL,
            browser,
            maxPages,
            maxDepth,
            includeExternalLinks
        });

        res.json({
            projectName,
            testCase,
            result
        });

    } catch (error) {
        console.error('Crawler error:', error);

        res.status(500).json({
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`QA Automation API running on port ${PORT}`);
});
