import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

if (!fs.existsSync(distDir)) {
  console.error('Dist directory does not exist. Run vite build first.');
  process.exit(1);
}

const templatePath = path.join(distDir, 'index.html');
if (!fs.existsSync(templatePath)) {
  console.error('dist/index.html not found.');
  process.exit(1);
}

const template = fs.readFileSync(templatePath, 'utf8');

// Ensure .nojekyll exists
fs.writeFileSync(path.join(distDir, '.nojekyll'), '');

const routes = [
  {
    path: 'about',
    title: 'About Placement Mantra | Founder Raunak Singh',
    description: 'Placement Mantra was founded by Raunak Singh, MBA candidate at Great Lakes Institute of Management. Explore our mission, vision, and placement preparation ecosystem.',
    canonical: 'https://placementmantra.shop/about',
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "ProfilePage",
          "@id": "https://placementmantra.shop/about#webpage",
          "url": "https://placementmantra.shop/about",
          "name": "About Founder Raunak Singh - Placement Mantra",
          "description": "Founder profile and story behind Placement Mantra.",
          "isPartOf": {
            "@id": "https://placementmantra.shop/#website"
          },
          "mainEntity": {
            "@type": "Person",
            "@id": "https://placementmantra.shop/#founder",
            "name": "Raunak Singh",
            "jobTitle": "Founder & Lead Architect",
            "worksFor": {
              "@id": "https://placementmantra.shop/#organization"
            },
            "alumniOf": {
              "@type": "CollegeOrUniversity",
              "name": "Great Lakes Institute of Management"
            },
            "email": "raunaksingh181190@gmail.com",
            "telephone": "+919334318989",
            "url": "https://placementmantra.shop/about"
          }
        },
        {
          "@type": "Organization",
          "@id": "https://placementmantra.shop/#organization",
          "name": "Placement Mantra",
          "alternateName": "PlacementMantra",
          "url": "https://placementmantra.shop/",
          "logo": "https://placementmantra.shop/logo.png",
          "description": "Comprehensive placement preparation and AI Career Coaching ecosystem for MBA and management professionals.",
          "founder": {
            "@id": "https://placementmantra.shop/#founder"
          }
        }
      ]
    },
    noscript: `
      <div style="font-family:sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6;">
        <h1>About Placement Mantra</h1>
        <h2>Founder: Raunak Singh</h2>
        <p>Placement Mantra was founded by <strong>Raunak Singh</strong>, an MBA candidate at <strong>Great Lakes Institute of Management</strong>.</p>
        <p>Placement Mantra is an all-in-one placement preparation portal offering mock tests, company interview intelligence, domain prep modules (Consulting, Finance, Marketing, Operations, Analytics), and AI-powered career coaching.</p>
        <h3>Contact the Founder</h3>
        <ul>
          <li>Email: <a href="mailto:raunaksingh181190@gmail.com">raunaksingh181190@gmail.com</a></li>
          <li>Phone: <a href="tel:+919334318989">+91 9334318989</a></li>
          <li>WhatsApp: <a href="https://wa.me/918539036364">+91 8539036364</a></li>
        </ul>
      </div>
    `
  },
  {
    path: 'contact',
    title: 'Contact Us | Placement Mantra Support & Inquiries',
    description: 'Get in touch with the Placement Mantra team and founder Raunak Singh for placement preparation support, partnerships, or question bank inquiries.',
    canonical: 'https://placementmantra.shop/contact',
    noscript: `
      <div style="font-family:sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6;">
        <h1>Contact Placement Mantra</h1>
        <p>Email: <a href="mailto:raunaksingh181190@gmail.com">raunaksingh181190@gmail.com</a></p>
        <p>Phone: <a href="tel:+919334318989">+91 9334318989</a></p>
        <p>WhatsApp: <a href="https://wa.me/918539036364">+91 8539036364</a></p>
      </div>
    `
  },
  {
    path: 'privacy',
    title: 'Privacy Policy | Placement Mantra',
    description: 'Privacy Policy for Placement Mantra placement preparation portal.',
    canonical: 'https://placementmantra.shop/privacy'
  },
  {
    path: 'terms',
    title: 'Terms of Service | Placement Mantra',
    description: 'Terms of Service for Placement Mantra placement preparation portal.',
    canonical: 'https://placementmantra.shop/terms'
  },
  {
    path: 'aptitude',
    title: 'Aptitude Preparation & Practice | Placement Mantra',
    description: 'Master quantitative aptitude, logical reasoning, and verbal ability with curated practice modules and mock tests.',
    canonical: 'https://placementmantra.shop/aptitude'
  },
  {
    path: 'domain-prep',
    title: 'MBA Domain Preparation | Consulting, Finance, Marketing, Ops - Placement Mantra',
    description: 'Specialized MBA placement preparation for Consulting, Finance, Marketing, Operations, and Analytics.',
    canonical: 'https://placementmantra.shop/domain-prep'
  },
  {
    path: 'companies',
    title: 'Company Placement Patterns & Question Banks | Placement Mantra',
    description: 'Explore company-specific recruitment patterns, past interview questions, and placement intelligence.',
    canonical: 'https://placementmantra.shop/companies'
  },
  {
    path: 'mock-tests',
    title: 'Full Length Placement Mock Tests | Placement Mantra',
    description: 'Simulate real placement exams with timed mock tests, instant scoring, and detailed performance analytics.',
    canonical: 'https://placementmantra.shop/mock-tests'
  },
  {
    path: 'ai-coach',
    title: 'AI Career & Placement Coach | Placement Mantra',
    description: 'Personalized AI placement preparation coach for resume feedback, interview prep, and career strategy.',
    canonical: 'https://placementmantra.shop/ai-coach'
  },
  {
    path: 'login',
    title: 'Sign In | Placement Mantra',
    description: 'Sign in to your Placement Mantra account to access tests, study materials, and AI Coach.',
    canonical: 'https://placementmantra.shop/login'
  },
  {
    path: 'register',
    title: 'Create an Account | Placement Mantra',
    description: 'Register for Placement Mantra to start your campus placement preparation.',
    canonical: 'https://placementmantra.shop/register'
  }
];

for (const route of routes) {
  let html = template;

  if (route.title) {
    html = html.replace(/<title>.*?<\/title>/i, `<title>${route.title}</title>`);
    html = html.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${route.title}" />`);
    html = html.replace(/<meta name="twitter:title" content=".*?" \/>/i, `<meta name="twitter:title" content="${route.title}" />`);
  }

  if (route.description) {
    html = html.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${route.description}" />`);
    html = html.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${route.description}" />`);
    html = html.replace(/<meta name="twitter:description" content=".*?" \/>/i, `<meta name="twitter:description" content="${route.description}" />`);
  }

  if (route.canonical) {
    html = html.replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${route.canonical}" />`);
    if (!html.includes('rel="canonical"')) {
      html = html.replace('</head>', `    <link rel="canonical" href="${route.canonical}" />\n  </head>`);
    } else {
      html = html.replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${route.canonical}" />`);
    }
  }

  if (route.schema) {
    const schemaScript = `    <script type="application/ld+json">\n    ${JSON.stringify(route.schema, null, 2).split('\n').join('\n    ')}\n    </script>`;
    html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, schemaScript);
  }

  if (route.noscript) {
    html = html.replace('<div id="root"></div>', `<div id="root"></div>\n    <noscript>${route.noscript}</noscript>`);
  }

  // 1. Write dist/${route.path}.html
  const flatFile = path.join(distDir, `${route.path}.html`);
  fs.writeFileSync(flatFile, html, 'utf8');

  // 2. Write dist/${route.path}/index.html
  const folderPath = path.join(distDir, route.path);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  const nestedFile = path.join(folderPath, 'index.html');
  fs.writeFileSync(nestedFile, html, 'utf8');

  console.log(`✓ Generated static route: /${route.path} -> ${route.path}.html and ${route.path}/index.html`);
}

console.log('Static route generation complete!');
