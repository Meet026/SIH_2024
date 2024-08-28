import puppeteer from 'puppeteer-extra';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';

const YOUR_2CAPTCHA_API_KEY = '7b18577c3c5835dfe7983506d01724c2';

puppeteer.use(
  RecaptchaPlugin({
    provider: { id: '2captcha', token: YOUR_2CAPTCHA_API_KEY },
    visualFeedback: true, // Colorize reCAPTCHAs (violet = detected, green = solved)
  })
);

export async function fetchFlipkartProducts(itemName, make, model) {
  const searchQuery = `${itemName} ${make} ${model}`;
  const flipkartBaseUrl = "https://www.flipkart.com";
  const usdToInrRate = 83; // Example conversion rate

  let products = [];
  let currentPage = 1;
  const maxPages = 6; // Limit to 6 pages

  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0');

    while (currentPage <= maxPages) { // Limit the loop to 6 pages
      const searchUrl = `${flipkartBaseUrl}/search?q=${encodeURIComponent(searchQuery)}&page=${currentPage}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      const { solved } = await page.solveRecaptchas();
      console.log('Recaptchas solved:', solved);

      const pageProducts = await page.evaluate((flipkartBaseUrl) => {
        return Array.from(document.querySelectorAll('.cPHDOP.col-12-12')).map(element => {
          const titleElement = element.querySelector('.col .KzDlHZ');
          const title = titleElement ? titleElement.innerText.trim() : null;

          const linkElement = element.querySelector('.tUxRFH a.CGtC98');
          const source = linkElement ? linkElement.getAttribute("href") : null;
          const image = source ? `${flipkartBaseUrl}${source}` : null;

          const priceElement = element.querySelector('.hl05eU .Nx9bqj._4b5DiR');
          const price = priceElement ? priceElement.innerText.trim() : null;

          if (title && image && price) {
            return {
              title,
              image,
              price,
            };
          }
          return null;
        }).filter(product => product !== null); // Filter out any null products
      }, flipkartBaseUrl);

      products = products.concat(pageProducts);

      // Check if there's a "Next" button for pagination
      const hasNextPage = await page.evaluate(() => {
        const nextButton = document.querySelector('a._9QVEpD');
        return nextButton && !nextButton.classList.contains('disabled');
      });

      if (!hasNextPage) break; // Stop if there is no next page

      currentPage++;
    }

    await browser.close();
    return products;
  } catch (error) {
    console.error('Error fetching products from Flipkart:', error);
    await browser.close();
    return [];
  }
}
