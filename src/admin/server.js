const express = require('express');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const matter = require('gray-matter'); // Optional parser to extract tags/metadata from markdown headers

const app = express();
app.use(express.json());

// 1. SERVE THE GENERATED STATIC SITES LIVE
// Express serves your static files instantly out of the public folder
app.use(express.static(path.join(__dirname, '../public')));

const CONTENT_DIR = path.join(__dirname, '../content');
const PUBLIC_DIR = path.join(__dirname, '../public');
const TEMPLATE_PATH = path.join(__dirname, '../templates/layout.html');

// 2. THE LIVE COMPLIATION LOOP ENDPOINT
app.post('/api/publish', (req, res) => {
    try {
        // Read your layout shell framework file (holds your dark theme, sidebar, etc.)
        const baseLayout = fs.readFileSync(TEMPLATE_PATH, 'utf8');
        
        // Read all your individual markdown text records
        const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
        const postsMetadata = [];

        files.forEach(file => {
            const rawContent = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
            
            // Extract frontmatter properties (title, tags, category) from the body text
            const { data, content } = matter(rawContent);
            const slug = file.replace('.md', '');
            
            // Turn raw markdown text blocks into true HTML via marked
            const htmlBody = marked.parse(content);
            
            // Inject structural variables straight into your clean layout template shell
            let finalPageHtml = baseLayout
                .replace('{{TITLE}}', data.title || 'Josh James')
                .replace('{{CONTENT}}', htmlBody);

            // Save the compiled production HTML file straight to the public folder
            fs.writeFileSync(path.join(PUBLIC_DIR, `posts/${slug}.html`), finalPageHtml, 'utf8');
            
            // Collect metadata variables to construct the landing page timeline dynamically
            postsMetadata.push({
                title: data.title,
                slug: slug,
                category: data.category,
                tags: data.tags || [],
                date: data.date
            });
        });

        // Generate the central Index landing timeline page using the gathered post array
        let indexTimelineHtml = '';
        postsMetadata.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(post => {
            indexTimelineHtml += `
                <article class="space-y-2 group">
                    <div class="flex items-center gap-x-3 font-mono text-xs text-[#64748b]">
                        <time>${post.date}</time>
                        <span class="text-[#38bdf8] bg-[#38bdf8]/10 px-2 py-0.5 rounded">[${post.category}]</span>
                    </div>
                    <h3 class="text-base font-semibold"><a href="/posts/${post.slug}.html" class="hover:underline">${post.title}</a></h3>
                </article>
            `;
        });

        const finalIndexHtml = baseLayout
            .replace('{{TITLE}}', 'Josh James | Infrastructure Engineer')
            .replace('{{CONTENT}}', `<div class="space-y-8">${indexTimelineHtml}</div>`);
            
        fs.writeFileSync(path.join(PUBLIC_DIR, 'index.html'), finalIndexHtml, 'utf8');

        return res.json({ status: 'success', message: 'All flat HTML assets compiled in milliseconds.' });
    } catch (err) {
        return res.status(500).json({ status: 'error', error: err.message });
    }
});

app.listen(8080, () => console.log('Portfolio Engine listening on port 8080'));