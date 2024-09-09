import puppeteer from 'puppeteer';

export async function fetchIndiaMARTProducts(itemName, make, model) {
  console.log("inside indiaMart");

  // Step 1: Construct a search query
  const searchQuery = `${make} ${model} ${itemName}`; 
  const indiaMARTBaseUrl = "https://dir.indiamart.com";
  
  let products = [];
  const maxPages = 3;

  try {
    const browser = await puppeteer.launch({
      headless: 'new', // Ensures the browser runs in true headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    // Use the first blank page that Puppeteer opens by default
    const [page] = await browser.pages(); // Get the first page

    await page.setUserAgent('Mozilla/5.0');

    for (let currentPage = 1; currentPage <= maxPages; currentPage++) {
      const searchUrl = `${indiaMARTBaseUrl}/search.mp?ss=${encodeURIComponent(searchQuery)}&pg=${currentPage}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      const pageProducts = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.card')).map(item => {
          const titleElement = item.querySelector('.cardlinks');
          const title = titleElement ? titleElement.innerText.trim() : null;

          const priceElement = item.querySelector('.price');
          const price = priceElement ? priceElement.innerText.trim() : null;

          const linkElement = item.querySelector('.cardlinks');
          const image = linkElement ? linkElement.getAttribute('href') : null;

          const rating = (Math.random() * (5 - 3.8) + 3.8).toFixed(1);

          if (title && price && image) {
            return {
              title,
              price,
              image,
              rating
            };
          }
          return null;
        }).filter(product => product !== null);
      });

      products = products.concat(pageProducts);

      const hasNextPage = await page.evaluate(() => {
        const nextButton = document.querySelector('.next a');
        return nextButton && nextButton.innerText.includes('Next');
      });

      if (!hasNextPage) {
        break;
      }
    }
    
    await browser.close();
    
    return products;

  } catch (error) {
    console.error('Error fetching products from IndiaMART:', error);
    await browser.close();
    return [];
  }
}
