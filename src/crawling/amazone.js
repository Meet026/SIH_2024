import puppeteer from 'puppeteer';

export async function fetchAmazonProducts(itemName, make, model) {
  const searchQuery = `${itemName} ${make} ${model}`;
  const amazonBaseUrl = "https://www.amazon.com";
  const usdToInrRate = 83; // Example conversion rate

  let products = [];
  let currentPage = 1;
  const maxPages = 3;

  try {
    const browser = await puppeteer.launch({
      headless: false, // Ensures the browser runs in true headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ]
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0');

    while (currentPage <= maxPages) {
      const searchUrl = `${amazonBaseUrl}/s?k=${encodeURIComponent(searchQuery)}&page=${currentPage}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      const pageProducts = await page.evaluate((amazonBaseUrl, usdToInrRate) => {
        return Array.from(document.querySelectorAll('.s-main-slot .s-result-item')).map(item => {
          const titleElement = item.querySelector('h2 a span');
          const title = titleElement ? titleElement.innerText.trim() : null;

          const priceWholeElement = item.querySelector('.a-price .a-price-whole');
          const priceFractionElement = item.querySelector('.a-price .a-price-fraction');
          const priceInUSD = priceWholeElement && priceFractionElement
            ? parseFloat(`${priceWholeElement.innerText.trim()}.${priceFractionElement.innerText.trim()}`)
            : null;

          const priceInINR = priceInUSD ? (priceInUSD * usdToInrRate).toFixed(2) : null;

          const linkElement = item.querySelector('h2 a');
          const image = linkElement ? `${amazonBaseUrl}${linkElement.getAttribute('href')}` : null;

          const ratingElement = item.querySelector('.a-icon-alt');
          const rating = ratingElement ? ratingElement.innerHTML.trim() : null;

          if (title && priceInINR && image) {
            return {
              title,
              price: `₹${priceInINR}`,
              image,
              rating
            };
          }
          return null;
        }).filter(product => product !== null); // Filter out any null products
      }, amazonBaseUrl, usdToInrRate);

      products = products.concat(pageProducts);

      console.log(`amazone Page ${currentPage} scraped, found ${pageProducts.length} products.`);

      // Check if there's a "Next" button for pagination
      const hasNextPage = await page.evaluate(() => {
        const nextButton = document.querySelector('.s-pagination-next');
        return nextButton
      });

      if (!hasNextPage) {
        break; // Exit the loop if there's no next page
      }

      currentPage++;
    }

    await browser.close();
    return products;
  } catch (error) {
    console.error('Error fetching products from Amazon:', error);
    await browser.close();
    return [];
  }
}