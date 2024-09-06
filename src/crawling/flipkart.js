import puppeteer from 'puppeteer-extra';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import natural from 'natural'; // Import the natural library

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
  const maxPages = 6; // Limit to 6 pages

  try {
    const browser = await puppeteer.launch({
      headless: 'new', // Ensures the browser runs in true headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ]
    });

    // Use the first blank page that Puppeteer opens by default
    const [page] = await browser.pages(); // Get the first page

    await page.setUserAgent('Mozilla/5.0');

    // Fetch all products from the specified pages
    for (let currentPage = 1; currentPage <= maxPages; currentPage++) {
      const searchUrl = `${flipkartBaseUrl}/search?q=${encodeURIComponent(searchQuery)}&page=${currentPage}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      const { solved } = await page.solveRecaptchas();

      const pageProducts = await page.evaluate((flipkartBaseUrl) => {
        return Array.from(document.querySelectorAll('.cPHDOP.col-12-12')).map(element => {
          const titleElement = element.querySelector('.col .KzDlHZ');
          const title = titleElement ? titleElement.innerText.trim() : null;

          const linkElement = element.querySelector('.tUxRFH a.CGtC98');
          const source = linkElement ? linkElement.getAttribute("href") : null;
          const image = source ? `${flipkartBaseUrl}${source}` : null;

          const priceElement = element.querySelector('.hl05eU .Nx9bqj._4b5DiR');
          const price = priceElement ? priceElement.innerText.trim() : null;

          return title && image && price ? { title, image, price } : null;
        }).filter(product => product !== null); // Filter out any null products
      }, flipkartBaseUrl);

      products = products.concat(pageProducts);

      // Check if there's a "Next" button for pagination
      const hasNextPage = await page.evaluate(() => {
        const nextButton = document.querySelector('a._9QVEpD');
        return nextButton && !nextButton.classList.contains('disabled');
      });

      if (!hasNextPage) break; // Stop if there is no next page
    }

    await browser.close();

    // Now apply natural language processing to filter products
    const relevantProducts = products.filter(product => {
      if (!product.title) return false; // Ensure title is not null

      const tokenizer = new natural.WordTokenizer();
      const titleTokens = tokenizer.tokenize(product.title.toLowerCase());
      const queryTokens = tokenizer.tokenize(searchQuery.toLowerCase());

      const commonTokens = queryTokens.filter(token => titleTokens.includes(token));

      // Require that most of the tokens match for relevance
      const matchScore = commonTokens.length / queryTokens.length;
      return matchScore > 0.5; // Adjust threshold as needed
    });

    // Sort by match score (optional) and limit to the first 3 most relevant products
    const sortedRelevantProducts = relevantProducts.sort((a, b) => {
      const tokenizer = new natural.WordTokenizer();
      const aTokens = tokenizer.tokenize(a.title.toLowerCase());
      const bTokens = tokenizer.tokenize(b.title.toLowerCase());
      const queryTokens = tokenizer.tokenize(searchQuery.toLowerCase());

      const aCommonTokens = queryTokens.filter(token => aTokens.includes(token));
      const bCommonTokens = queryTokens.filter(token => bTokens.includes(token));

      return bCommonTokens.length - aCommonTokens.length;
    });

    return sortedRelevantProducts.slice(0, 3);

  } catch (error) {
    console.error('Error fetching products from Flipkart:', error);
    return [];
  }
}
