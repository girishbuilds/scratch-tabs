#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Configuration
const RELEASES_FILE = path.join(__dirname, 'releases.yml');
const CHANGELOG_HTML_FILE = path.join(__dirname, '..', 'landing', 'changelog.html');
const WELCOME_SCREEN_FILE = path.join(__dirname, '..', 'src', 'components', 'Welcome', 'WelcomeScreen.tsx');
const WELCOME_CONTENT_FILE = path.join(__dirname, '..', 'src', 'constants', 'welcomeContent.ts');
const RELEASES_TS_FILE = path.join(__dirname, '..', 'src', 'data', 'releases.ts');

/**
 * Remove all emojis from a string
 */
function stripEmojis(str) {
  return str.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]|[\u{E0020}-\u{E007F}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23EC}]|[\u{23F0}]|[\u{23F3}]|[\u{25FD}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2705}]|[\u{270A}-\u{270B}]|[\u{2728}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2795}-\u{2797}]|[\u{27B0}]|[\u{27BF}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{203C}]|[\u{2049}]|[\u{2122}]|[\u{2139}]|[\u{2194}-\u{2199}]|[\u{21A9}-\u{21AA}]|[\u{231A}-\u{231B}]|[\u{2328}]|[\u{23CF}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{24C2}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2600}-\u{2604}]|[\u{260E}]|[\u{2611}]|[\u{2614}-\u{2615}]|[\u{2618}]|[\u{261D}]|[\u{2620}]|[\u{2622}-\u{2623}]|[\u{2626}]|[\u{262A}]|[\u{262E}-\u{262F}]|[\u{2638}-\u{263A}]|[\u{2640}]|[\u{2642}]|[\u{2648}-\u{2653}]|[\u{265F}-\u{2660}]|[\u{2663}]|[\u{2665}-\u{2666}]|[\u{2668}]|[\u{267B}]|[\u{267E}-\u{267F}]|[\u{2692}-\u{2697}]|[\u{2699}]|[\u{269B}-\u{269C}]|[\u{26A0}-\u{26A1}]|[\u{26A7}]|[\u{26AA}-\u{26AB}]|[\u{26B0}-\u{26B1}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26C8}]|[\u{26CE}-\u{26CF}]|[\u{26D1}]|[\u{26D3}-\u{26D4}]|[\u{26E9}-\u{26EA}]|[\u{26F0}-\u{26F5}]|[\u{26F7}-\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]|[\u{FE0F}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F170}-\u{1F171}]|[\u{1F17E}-\u{1F17F}]|[\u{1F18E}]|[\u{1F191}-\u{1F19A}]|[\u{1F201}-\u{1F202}]|[\u{1F21A}]|[\u{1F22F}]|[\u{1F232}-\u{1F23A}]|[\u{1F250}-\u{1F251}]|[\u{1F300}-\u{1F321}]|[\u{1F324}-\u{1F393}]|[\u{1F396}-\u{1F397}]|[\u{1F399}-\u{1F39B}]|[\u{1F39E}-\u{1F3F0}]|[\u{1F3F3}-\u{1F3F5}]|[\u{1F3F7}-\u{1F4FD}]|[\u{1F4FF}-\u{1F53D}]|[\u{1F549}-\u{1F54E}]|[\u{1F550}-\u{1F567}]|[\u{1F56F}-\u{1F570}]|[\u{1F573}-\u{1F57A}]|[\u{1F587}]|[\u{1F58A}-\u{1F58D}]|[\u{1F590}]|[\u{1F595}-\u{1F596}]|[\u{1F5A4}-\u{1F5A5}]|[\u{1F5A8}]|[\u{1F5B1}-\u{1F5B2}]|[\u{1F5BC}]|[\u{1F5C2}-\u{1F5C4}]|[\u{1F5D1}-\u{1F5D3}]|[\u{1F5DC}-\u{1F5DE}]|[\u{1F5E1}]|[\u{1F5E3}]|[\u{1F5E8}]|[\u{1F5EF}]|[\u{1F5F3}]|[\u{1F5FA}-\u{1F64F}]|[\u{1F680}-\u{1F6C5}]|[\u{1F6CB}-\u{1F6D2}]|[\u{1F6D5}-\u{1F6D7}]|[\u{1F6DD}-\u{1F6E5}]|[\u{1F6E9}]|[\u{1F6EB}-\u{1F6EC}]|[\u{1F6F0}]|[\u{1F6F3}-\u{1F6FC}]|[\u{1F7E0}-\u{1F7EB}]|[\u{1F7F0}]|[\u{1F90C}-\u{1F93A}]|[\u{1F93C}-\u{1F945}]|[\u{1F947}-\u{1F9FF}]|[\u{1FA70}-\u{1FA74}]|[\u{1FA78}-\u{1FA7C}]|[\u{1FA80}-\u{1FA86}]|[\u{1FA90}-\u{1FAAC}]|[\u{1FAB0}-\u{1FABA}]|[\u{1FAC0}-\u{1FAC5}]|[\u{1FAD0}-\u{1FAD9}]|[\u{1FAE0}-\u{1FAE7}]|[\u{1FAF0}-\u{1FAF8}]/gu, '').trim();
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Generate badge HTML based on release type
 */
function generateBadge(type) {
  const badges = {
    latest: '<span class="badge latest">LATEST</span>',
    beta: '<span class="badge release">BETA</span>',
    alpha: '<span class="badge release">ALPHA</span>',
    release: '<span class="badge release">RELEASE</span>'
  };
  return badges[type] || '';
}

/**
 * Generate full detail changelog entry (for latest release only)
 */
function generateDetailedEntry(release) {
  const cleanHeadline = stripEmojis(release.headline);

  let html = `
        <!-- Version ${release.version} -->
        <div class="changelog-entry latest">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
            <div class="flex items-center gap-3">
              <h2 class="text-2xl font-bold text-white">V${release.version}</h2>
              ${generateBadge(release.type)}
            </div>
            <span class="text-gray-500 text-xs font-mono">${formatDate(release.date)}</span>
          </div>
          <h3 class="text-lg font-bold text-emerald-500 mb-4 font-mono">${cleanHeadline.toUpperCase()}</h3>
          <div class="changelog-content text-gray-400 text-sm leading-relaxed">
            <p class="mb-4">${release.description}</p>`;

  // Add categories and changes for detailed view
  if (release.categories && release.categories.length > 0) {
    release.categories.forEach(category => {
      const cleanCategoryName = stripEmojis(category.name);
      html += `

            <h4 class="text-white text-xs font-mono uppercase tracking-widest mb-3"># ${cleanCategoryName.toLowerCase().replace(/\s+/g, '_')}</h4>
            <ul class="space-y-2 mb-6">`;

      category.changes.forEach(change => {
        // Convert markdown bold (**text**) to HTML bold (<strong>text</strong>)
        const formattedChange = stripEmojis(change).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html += `
              <li class="flex items-start gap-2"><span class="text-emerald-500 mt-1">+</span> <span>${formattedChange}</span></li>`;
      });

      html += `
            </ul>`;
    });
  }

  html += `
          </div>
        </div>`;

  return html;
}

/**
 * Generate summary changelog entry (for previous releases)
 */
function generateSummaryEntry(release) {
  const cleanHeadline = stripEmojis(release.headline);
  const cleanSummary = stripEmojis(release.summary || release.description);

  let html = `
        <!-- Version ${release.version} -->
        <div class="changelog-entry release">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
            <div class="flex items-center gap-3">
              <h2 class="text-xl font-bold text-white uppercase">V${release.version}</h2>
              ${generateBadge(release.type)}
            </div>
            <span class="text-gray-500 text-xs font-mono">${formatDate(release.date)}</span>
          </div>
          <h3 class="text-lg font-bold text-gray-400 mb-4 font-mono">${cleanHeadline.toUpperCase()}</h3>
          <div class="changelog-content text-gray-400 text-sm leading-relaxed">
            <p>${cleanSummary}</p>
          </div>
        </div>`;

  return html;
}

/**
 * Generate the complete changelog HTML content
 */
function generateChangelogHTML(releases, maxVersions) {
  const releasesToShow = releases.slice(0, maxVersions);

  let html = '';

  releasesToShow.forEach((release, index) => {
    if (index === 0) {
      // First release gets full detail
      html += generateDetailedEntry(release);
    } else {
      // All others get summary only
      html += generateSummaryEntry(release);
    }
  });

  // Add footer
  html += `

        <!-- Footer Feedback -->
        <div class="text-center pt-12 border-t border-gray-900 mt-12">
          <h4 class="text-white text-lg font-mono mb-4 uppercase tracking-tighter"># feedback_loop</h4>
          <p class="text-gray-500 text-sm mb-8">
            Want to suggest a feature or report a bug? Join the conversation on GitHub or Discord.
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a href="https://github.com/girishbuilds/scratch-tabs/issues" target="_blank"
              class="terminal-button px-6 py-2">
              <span class="text-gray-500 mr-2">$</span> open_github_issue<span class="cursor-blink">|</span>
            </a>
            <a href="https://discord.gg/HwsfpTzMVS" target="_blank" class="terminal-button px-6 py-2">
              <span class="text-gray-500 mr-2">$</span> join_the_discord<span class="cursor-blink">|</span>
            </a>
          </div>
        </div>`;

  return html;
}

/**
 * Update the changelog.html file with new content
 */
function updateChangelogFile(changelogHTML) {
  try {
    const htmlContent = fs.readFileSync(CHANGELOG_HTML_FILE, 'utf8');

    // Find the changelog content section
    const startMarker = '<div class="max-w-4xl mx-auto">';
    const endMarker = '</div>\n    </div>\n  </section>';

    const startIndex = htmlContent.indexOf(startMarker);
    const endIndex = htmlContent.indexOf(endMarker, startIndex + startMarker.length);

    if (startIndex === -1 || endIndex === -1) {
      throw new Error('Could not find changelog content markers in HTML file');
    }

    const beforeContent = htmlContent.substring(0, startIndex + startMarker.length);
    const afterContent = htmlContent.substring(endIndex);

    const newContent = beforeContent + '\n' + changelogHTML + '\n      ' + afterContent;

    fs.writeFileSync(CHANGELOG_HTML_FILE, newContent, 'utf8');
    console.log('✅ Updated changelog.html successfully');
  } catch (error) {
    console.error('❌ Error updating changelog.html:', error.message);
    process.exit(1);
  }
}

/**
 * Update the version in WelcomeScreen component
 */
function updateWelcomeScreenVersion(latestVersion) {
  try {
    // Try to update the welcome content file first
    if (fs.existsSync(WELCOME_CONTENT_FILE)) {
      let content = fs.readFileSync(WELCOME_CONTENT_FILE, 'utf8');

      // Look for version pattern in the content
      const versionRegex = /(Version\s+)[\d.-]+/i;
      if (versionRegex.test(content)) {
        content = content.replace(versionRegex, `$1${latestVersion}`);
        fs.writeFileSync(WELCOME_CONTENT_FILE, content, 'utf8');
        console.log(`✅ Updated version to ${latestVersion} in welcomeContent.ts`);
      }
    }

    // Try to update the WelcomeScreen component
    if (fs.existsSync(WELCOME_SCREEN_FILE)) {
      let content = fs.readFileSync(WELCOME_SCREEN_FILE, 'utf8');

      // Look for version pattern in JSX: // vX.X.X
      const versionPattern = /(\/\/\s+v)([\d.-]+[\$\d]*)/g;

      if (versionPattern.test(content)) {
        content = content.replace(versionPattern, `$1${latestVersion}`);
        fs.writeFileSync(WELCOME_SCREEN_FILE, content, 'utf8');
        console.log(`✅ Updated version to ${latestVersion} in WelcomeScreen.tsx`);
      } else {
        console.log('⚠️  No version pattern found in WelcomeScreen.tsx');
      }
    }
  } catch (error) {
    console.error('❌ Error updating welcome screen version:', error.message);
  }
}

/**
 * Generate TypeScript releases data file for in-app changelog
 */
function generateReleasesTS(releases, maxVersions) {
  const releasesToExport = releases.slice(0, maxVersions);

  // Transform releases to a clean TypeScript structure
  const cleanReleases = releasesToExport.map(release => ({
    version: release.version,
    type: release.type,
    date: release.date,
    headline: stripEmojis(release.headline),
    summary: stripEmojis(release.summary || release.description),
    categories: (release.categories || []).map(cat => ({
      name: stripEmojis(cat.name),
      changes: (cat.changes || []).map(change => stripEmojis(change))
    }))
  }));

  const latestVersion = cleanReleases[0]?.version || '0.0.0';

  const tsContent = `// Auto-generated from releases.yml - DO NOT EDIT MANUALLY
// Run: cd changelog && node generate.js

export interface ReleaseCategory {
  name: string;
  changes: string[];
}

export interface Release {
  version: string;
  type: 'latest' | 'release' | 'beta' | 'alpha';
  date: string;
  headline: string;
  summary: string;
  categories: ReleaseCategory[];
}

export const APP_VERSION = '${latestVersion}';

export const RELEASES: Release[] = ${JSON.stringify(cleanReleases, null, 2)};

export const getLatestRelease = (): Release | undefined => RELEASES[0];

export const getRecentReleases = (count: number = 10): Release[] => RELEASES.slice(0, count);
`;

  try {
    // Ensure the data directory exists
    const dataDir = path.dirname(RELEASES_TS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(RELEASES_TS_FILE, tsContent, 'utf8');
    console.log('✅ Generated src/data/releases.ts successfully');
  } catch (error) {
    console.error('❌ Error generating releases.ts:', error.message);
  }
}

/**
 * Update version in all landing page HTML files
 */
function updateLandingPagesVersion(latestVersion) {
  const landingDir = path.join(__dirname, '..', 'landing');
  const landingPages = ['index.html', 'changelog.html', 'features.html', 'tablets.html', 'faq.html'];

  try {
    landingPages.forEach(page => {
      const filePath = path.join(landingDir, page);

      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Landing page not found: ${page}`);
        return;
      }

      let content = fs.readFileSync(filePath, 'utf8');
      let updated = false;

      // Update footer version: SCRATCH_TABS // v1.14.0 -> SCRATCH_TABS // v{latestVersion}
      const footerVersionRegex = /(SCRATCH_TABS \/\/ v)[\d.]+/g;
      if (footerVersionRegex.test(content)) {
        content = content.replace(footerVersionRegex, `$1${latestVersion}`);
        updated = true;
      }

      // Special case: Update launch button in changelog.html
      if (page === 'changelog.html') {
        const launchButtonRegex = /(launch_latest_v)[\d.]+/g;
        if (launchButtonRegex.test(content)) {
          content = content.replace(launchButtonRegex, `$1${latestVersion}`);
          updated = true;
        }
      }

      // Special case: Update hero version tag in index.html
      if (page === 'index.html') {
        const heroVersionRegex = /(v)[\d.]+(\ \/\/ LATEST)/g;
        if (heroVersionRegex.test(content)) {
          content = content.replace(heroVersionRegex, `$1${latestVersion}$2`);
          updated = true;
        }
      }

      if (updated) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated version to ${latestVersion} in landing/${page}`);
      } else {
        console.log(`⚠️  No version pattern found in landing/${page}`);
      }
    });
  } catch (error) {
    console.error('❌ Error updating landing pages version:', error.message);
  }
}

/**
 * Main function
 */
function main() {
  try {
    console.log('🚀 Generating changelog from YAML...');

    // Check if js-yaml is available
    try {
      require.resolve('js-yaml');
    } catch (e) {
      console.error('❌ js-yaml module not found. Please install it with: npm install js-yaml');
      process.exit(1);
    }

    // Read and parse YAML file
    const yamlContent = fs.readFileSync(RELEASES_FILE, 'utf8');
    const data = yaml.load(yamlContent);

    if (!data || !data.releases || !Array.isArray(data.releases)) {
      throw new Error('Invalid YAML structure. Expected releases array.');
    }

    // Filter out draft releases (where draft: true)
    const allReleases = data.releases;
    const releases = allReleases.filter(release => !release.draft);
    const draftCount = allReleases.length - releases.length;

    const maxVersions = data.config?.max_versions || 10;

    if (releases.length === 0) {
      throw new Error('No releases found in YAML file');
    }

    if (draftCount > 0) {
      console.log(`📋 Found ${allReleases.length} total releases (${draftCount} drafts excluded), showing latest ${Math.min(releases.length, maxVersions)}`);
    } else {
      console.log(`📋 Found ${releases.length} releases, showing latest ${Math.min(releases.length, maxVersions)}`);
    }

    // Generate changelog HTML
    const changelogHTML = generateChangelogHTML(releases, maxVersions);

    // Update changelog.html
    updateChangelogFile(changelogHTML);

    // Generate TypeScript releases data file
    generateReleasesTS(releases, maxVersions);

    // Update version in welcome screen and landing pages
    const latestVersion = releases[0].version;
    updateWelcomeScreenVersion(latestVersion);
    updateLandingPagesVersion(latestVersion);

    console.log('🎉 Changelog generation completed successfully!');
    console.log(`📝 Latest version: ${latestVersion}`);
    console.log(`✨ All emojis removed from output`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Check if running as script
if (require.main === module) {
  main();
}

module.exports = {
  main,
  generateChangelogHTML,
  generateReleasesTS,
  updateChangelogFile,
  updateWelcomeScreenVersion,
  updateLandingPagesVersion,
  stripEmojis
};
