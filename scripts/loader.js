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

async function loader() {
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

    document.getElementById('page-preloader')?.remove();
    document.body.style.display = 'block';

  } catch (err) {
    document.body.style.display = 'block';
  }
}

loader();
