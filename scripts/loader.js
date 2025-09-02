
function desanitizeAndInjectCSS(htmlString, cssString) {
  const desanitizedHtml = htmlString
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

  const parser = new DOMParser();
  const doc = parser.parseFromString(desanitizedHtml, 'text/html');

  const styleTag = document.createElement('style');
  styleTag.textContent = cssString;
  doc.head.appendChild(styleTag);

  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  // Cache duration in milliseconds (5 minutes default)
  duration: 5 * 60 * 1000,
  // Cache key prefix
  prefix: 'gblocks_dynamic_',
  // Enable/disable caching
  enabled: true
};

/**
 * Cache utility functions
 */
const CacheManager = {
  /**
   * Get cached data if available and not expired
   */
  get(key) {
    if (!CACHE_CONFIG.enabled) return null;
    
    try {
      const cacheKey = CACHE_CONFIG.prefix + key;
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) return null;
      
      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is expired
      if (now - timestamp > CACHE_CONFIG.duration) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      console.log(`📦 Cache HIT for ${key}`);
      return data;
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  },

  /**
   * Store data in cache
   */
  set(key, data) {
    if (!CACHE_CONFIG.enabled) return;
    
    try {
      const cacheKey = CACHE_CONFIG.prefix + key;
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`💾 Cache SET for ${key}`);
    } catch (error) {
      console.warn('Cache set error:', error);
      // If localStorage is full, clear old entries
      if (error.name === 'QuotaExceededError') {
        this.clearExpired();
      }
    }
  },

  /**
   * Clear expired cache entries
   */
  clearExpired() {
    const now = Date.now();
    const keysToRemove = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_CONFIG.prefix)) {
        try {
          const cached = JSON.parse(localStorage.getItem(key));
          if (now - cached.timestamp > CACHE_CONFIG.duration) {
            keysToRemove.push(key);
          }
        } catch (error) {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`🧹 Cleared ${keysToRemove.length} expired cache entries`);
  },

  /**
   * Clear all cache entries
   */
  clearAll() {
    const keysToRemove = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_CONFIG.prefix)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`🗑️ Cleared all ${keysToRemove.length} cache entries`);
  }
};

/**
 * Fetch dynamic data from API based on data type with caching
 */
async function fetchDynamicData(dataType) {
  const endpoints = {
    'posts': `/api/v1/design/dynamic/posts`,
    'authors': `/api/v1/design/dynamic/authors`,
    'tags': `/api/v1/design/dynamic/tags`,
    'pages': `/api/v1/design/dynamic/pages`
  };

  const endpoint = endpoints[dataType];
  if (!endpoint) {
    console.warn(`Unknown data type: ${dataType}`);
    return [];
  }

  // Try to get from cache first
  const cachedData = CacheManager.get(dataType);
  if (cachedData) {
    return cachedData;
  }

  try {
    console.log(`🌐 Fetching fresh ${dataType} data from API...`);
    const response = await fetch(`https://api.bloxear.com${endpoint}`);
    const result = await response.json();

    if (result.statusCode === 200 && result.data) {
      // Cache the successful response
      CacheManager.set(dataType, result.data);
      return result.data;
    }
    
    console.warn(`No data found for ${dataType}:`, result);
    return [];
  } catch (error) {
    console.error(`Error fetching ${dataType} data:`, error);
    return [];
  }
}

/**
 * Get nested property value from object (e.g., 'post.author.name')
 */
function getNestedPropertyValue(obj, path) {
  if (!obj || !path) return '';
  
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : '';
  }, obj);
}

/**
 * Sort data array by property and order
 */
function sortData(data, sortBy, sortOrder) {
  if (!data || !Array.isArray(data) || !sortBy) return data;
  
  const sorted = [...data].sort((a, b) => {
    const aVal = getNestedPropertyValue(a, sortBy);
    const bVal = getNestedPropertyValue(b, sortBy);
    
    // Handle different data types
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
    }
    
    if (aVal instanceof Date && bVal instanceof Date) {
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    }
    
    // Handle date strings
    const aDate = new Date(aVal);
    const bDate = new Date(bVal);
    if (!isNaN(aDate) && !isNaN(bDate)) {
      return sortOrder === 'desc' ? bDate - aDate : aDate - bDate;
    }
    
    // Fallback to string comparison
    return sortOrder === 'desc' ? String(bVal).localeCompare(String(aVal)) : String(aVal).localeCompare(String(bVal));
  });
  
  return sorted;
}

/**
 * Populate template with data
 */
function populateTemplate(template, itemData) {
  const clone = template.cloneNode(true);
  
  // Remove template attributes and show the clone
  clone.removeAttribute('data-item-template');
  clone.style.display = '';
  clone.classList.remove('dynamic-item-template');
  
  // Find all elements with data-bind-field and populate them
  const bindElements = clone.querySelectorAll('[data-bind-field]');
  
  bindElements.forEach(element => {
    const fieldPath = element.getAttribute('data-bind-field');
    const value = getNestedPropertyValue(itemData, fieldPath);
    
    if (value) {
      // Handle different element types
      switch (element.tagName.toLowerCase()) {
        case 'img':
          element.src = value;
          element.alt = element.alt || getNestedPropertyValue(itemData, 'title') || 'Image';
          break;
          
        case 'a':
          if (fieldPath.includes('url') || fieldPath.includes('link') || fieldPath.includes('href')) {
            element.href = value;
          } else {
            element.textContent = value;
          }
          break;
          
        case 'input':
          element.value = value;
          break;
          
        default:
          // For text elements (h1, h2, h3, p, span, div, etc.)
          element.textContent = value;
          break;
      }
    }
  });
  
  return clone;
}

/**
 * Process dynamic containers and populate with data
 */
async function processDynamicContainers(designData) {
  const dynamicContainers = document.querySelectorAll('[data-dynamic-type]');
  
  console.log(`🔗 Found ${dynamicContainers.length} dynamic containers`);
  
  // Log dynamic bindings if available for debugging
  if (designData && designData.dynamicBindings && designData.dynamicBindings.containers && designData.dynamicBindings.containers.length > 0) {
    console.log('📊 Dynamic bindings found:', designData.dynamicBindings);
  }
  
  for (const container of dynamicContainers) {
    const dataType = container.getAttribute('data-dynamic-type');
    const itemCount = parseInt(container.getAttribute('data-item-count')) || 6;
    const sortBy = container.getAttribute('data-sort-by') || 'published_at';
    const sortOrder = container.getAttribute('data-sort-order') || 'desc';
    
    console.log(`📊 Processing ${dataType} container:`, {
      itemCount,
      sortBy,
      sortOrder,
      containerId: container.id
    });
    
    // Find the template inside this container
    const template = container.querySelector('[data-item-template="true"]');
    if (!template) {
      console.warn(`❌ No template found in ${dataType} container`);
      continue;
    }
    
    try {
      // Fetch data for this container
      const data = await fetchDynamicData(dataType);
      console.log(data)
      if (!data || data.length === 0) {
        console.warn(`📭 No data found for ${dataType}`);
        // Hide the container or show empty state
        container.style.display = 'none';
        continue;
      }
      
      // Sort and limit data
      const sortedData = sortData(data, sortBy, sortOrder);
      const limitedData = sortedData.slice(0, itemCount);
      
      console.log(`✅ Processing ${limitedData.length} ${dataType} items`);
      
      // Create and append populated items
      const fragment = document.createDocumentFragment();
      
      limitedData.forEach((itemData, index) => {
        const populatedItem = populateTemplate(template, itemData);
        populatedItem.setAttribute('data-item-index', index.toString());
        fragment.appendChild(populatedItem);
      });
      
      // Append all items to container
      container.appendChild(fragment);
      
      console.log(`🎉 Successfully populated ${dataType} container with ${limitedData.length} items`);
      
    } catch (error) {
      console.error(`❌ Error processing ${dataType} container:`, error);
      // Hide container on error
      container.style.display = 'none';
    }
  }
}

async function loader() {
  // Clean up expired cache entries on page load
  CacheManager.clearExpired();
  
  // Extract slug from URL
  let slug = window.location.pathname.replace(/^\/+|\/+$/g, ''); // removes leading/trailing slashes
  if (!slug) slug = 'home'; // default fallback

  try {
    const response = await fetch("https://api.bloxear.com/api/v1/design/data", {
      headers: {
        "slug": slug
      }
    });

    const designData = await response.json();
    console.log("designData", designData);

    const parseDesignData = JSON.parse(designData.data);
    const generateHTML = desanitizeAndInjectCSS(parseDesignData.html, parseDesignData.css);
    document.write(generateHTML);
    
    // Process dynamic containers after HTML is rendered
    console.log('🔄 Processing dynamic containers...');
    await processDynamicContainers(parseDesignData);
    console.log('✅ Dynamic container processing complete');

    document.getElementById('page-preloader')?.remove();
    document.body.style.display = 'block';

  } catch (err) {
    console.error('❌ Loader error:', err);
    document.body.style.display = 'block';
  }
}

// Expose cache management to global scope for debugging
window.GBlocksCache = {
  clear: () => CacheManager.clearAll(),
  clearExpired: () => CacheManager.clearExpired(),
  config: CACHE_CONFIG,
  setDuration: (minutes) => {
    CACHE_CONFIG.duration = minutes * 60 * 1000;
    console.log(`Cache duration set to ${minutes} minutes`);
  },
  enable: () => {
    CACHE_CONFIG.enabled = true;
    console.log('Cache enabled');
  },
  disable: () => {
    CACHE_CONFIG.enabled = false;
    console.log('Cache disabled');
  }
};

loader();