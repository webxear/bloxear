# Bloxear Agent Development Guidelines

## Project Overview

This is a pure JavaScript dynamic content management system that integrates with the Bloxear CMS API. The project uses vanilla JavaScript without any frameworks or build tools, focusing on a single-file architecture (`scripts/loader.js`) that fetches and renders dynamic content from `https://api.bloxear.com`.

**Technology Stack:**
- Pure JavaScript (ES6+)
- DOM API for dynamic content rendering
- LocalStorage for caching
- RESTful API integration
- Static file deployment

## Development Commands

Since this project has no build system or package.json, development is browser-based:

```bash
# Start a local development server
python -m http.server 8000
# or
npx serve .

# Open browser to test
open http://localhost:8000

# Clear cache during development (in browser console)
window.GBlocksCache.clear()
window.GBlocksCache.clearExpired()

# Check cache status
window.GBlocksCache.config

# Disable cache for development
window.GBlocksCache.disable()
```

**Testing:** Open browser DevTools → Console to monitor emoji-prefixed logs and debug dynamic content loading.

## Code Style Guidelines

**JavaScript Standards:**
- Use ES6+ features: `async/await`, arrow functions, `const/let`, template literals
- camelCase for variables and functions: `fetchDynamicData`, `itemCount`
- UPPER_CASE for constants: `CACHE_CONFIG`, `API_ENDPOINTS`
- JSDoc-style comments for all functions

**Error Handling:**
```javascript
// Always use try/catch with descriptive console logging
try {
  const data = await fetchDynamicData(dataType);
  console.log(`✅ Success: ${dataType} data loaded`);
} catch (error) {
  console.error(`❌ Error fetching ${dataType}:`, error);
}
```

**Formatting:**
- 2-space indentation
- Semicolons required
- Template literals for string concatenation
- Emoji prefixes for console logs: `📦 🌐 ✅ ❌ 🔄 💾`

**Global Scope Management:**
- Expose debugging utilities: `window.GBlocksCache`
- Minimize global pollution
- Use descriptive function names

## Dynamic Data Binding System

The core feature uses HTML data attributes to map API data to DOM elements.

### Container Configuration

```html
<div data-dynamic-type="posts"       <!-- Data type: posts, authors, tags, pages -->
     data-item-count="6"             <!-- Number of items to display -->
     data-sort-by="published_at"     <!-- Sort field (default: published_at) -->
     data-sort-order="desc">         <!-- Sort order: asc/desc (default: desc) -->
```

### Template & Field Binding

```html
<!-- Template element (hidden by default) -->
<article data-item-template="true">
  <!-- Simple field binding -->
  <h2 data-bind-field="title"></h2>
  
  <!-- Nested field binding -->
  <p data-bind-field="author.name"></p>
  
  <!-- Text with character limit (NEW FEATURE) -->
  <p data-bind-field="excerpt" data-bind-limit="100"></p>
  
  <!-- Image binding -->
  <img data-bind-field="featured_image" alt="Post image">
  
  <!-- Link binding -->
  <a data-bind-field="permalink">Read More</a>
</article>
```

### Character Limiting (`data-bind-limit`)

**Rules for `data-bind-limit` attribute:**
- Applies to **text elements only**: h1, h2, h3, p, span, div, etc.
- **Does NOT apply to**: img, a, input elements
- Character count **excludes HTML tags**
- Always appends "..." when text is truncated
- Numeric value only: `data-bind-limit="60"`

**Implementation Pattern:**
```javascript
// In populateTemplate function, add after getting value:
if (value && element.getAttribute('data-bind-limit')) {
  const limit = parseInt(element.getAttribute('data-bind-limit'));
  if (limit > 0 && value.length > limit) {
    value = value.substring(0, limit) + '...';
  }
}
```

### Element Type Handling

- **Images**: `data-bind-field` maps to `src` attribute
- **Links**: URL fields → `href`, text fields → `textContent`
- **Inputs**: `data-bind-field` maps to `value` attribute
- **Text elements**: `data-bind-field` maps to `textContent` (with optional character limiting)

## API Integration Standards

**Base URL:** `https://api.bloxear.com`

**Supported Data Types:**
- `posts` → `/api/v1/design/dynamic/posts`
- `authors` → `/api/v1/design/dynamic/authors`
- `tags` → `/api/v1/design/dynamic/tags`
- `pages` → `/api/v1/design/dynamic/pages`

**Expected Response Format:**
```javascript
{
  statusCode: 200,
  data: [...] // Array of objects
}
```

**Error Handling Pattern:**
```javascript
if (result.statusCode === 200 && result.data) {
  return result.data;
}
console.warn(`No data found for ${dataType}:`, result);
return [];
```

## Caching System

**Configuration:**
- Duration: 5 minutes (300,000ms)
- Prefix: `gblocks_dynamic_`
- Storage: localStorage
- Automatic cleanup on page load

**Cache Management:**
```javascript
// Get cached data
CacheManager.get(key)

// Set cache data
CacheManager.set(key, data)

// Clear expired entries
CacheManager.clearExpired()
```

**Debug Commands:**
```javascript
window.GBlocksCache.clear()        // Clear all cache
window.GBlocksCache.setDuration(10) // Set 10-minute cache
window.GBlocksCache.disable()      // Disable caching
```

## Error Handling & Debugging

**Console Logging Standards:**
- `📦 Cache HIT for ${key}` - Cache operations
- `🌐 Fetching fresh ${dataType} data` - API calls  
- `✅ Successfully populated ${dataType}` - Success states
- `❌ Error processing ${dataType}` - Errors
- `🔄 Processing dynamic containers` - Process updates

**Graceful Degradation:**
- Hide containers when data fetch fails
- Show empty states for zero results
- Continue processing other containers on individual failures

**Common Debugging:**
1. Check browser Network tab for API calls
2. Monitor Console for emoji-prefixed logs
3. Inspect localStorage for cache entries
4. Verify HTML data attributes are correctly set

## Implementation Examples

**Complete Template Example:**
```html
<div data-dynamic-type="posts" data-item-count="3" data-sort-by="published_at" data-sort-order="desc">
  <article data-item-template="true" style="display: none;">
    <img data-bind-field="featured_image" alt="Post image">
    <h3 data-bind-field="title" data-bind-limit="60"></h3>
    <p data-bind-field="excerpt" data-bind-limit="120"></p>
    <span data-bind-field="author.name"></span>
    <time data-bind-field="published_at"></time>
    <a data-bind-field="permalink">Read More</a>
  </article>
</div>
```

**Field Path Examples:**
- `title` - Direct property
- `author.name` - Nested property
- `meta.seo.description` - Deep nested property
- `published_at` - Date field (auto-sorted)

## File Organization

```
/scripts/
  loader.js          # Main application logic (do not minify manually)
/assets/
  logo.png           # Brand assets
  logo.svg
README.md            # Project documentation
```

**Important:** Only modify `loader.js` - minification is handled separately in the build process.