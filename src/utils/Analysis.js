import natural from "natural"
import Sentiment from "sentiment"

function filterAndAnalyzeProducts(itemName, make, model, products) {
  const searchTerms = [itemName.toLowerCase(), make.toLowerCase(), model.toLowerCase()];

  // Step 1: Strict matching (all terms must be present)
  let filteredProducts = products.filter(product => {
      const title = product.title.toLowerCase();
      return searchTerms.every(term => title.includes(term));
  });

  // Step 2: Partial matching (at least two terms must be present)
  filteredProducts = filteredProducts.filter(product => {
    const title = product.title.toLowerCase();
    return title.includes(make.toLowerCase()) && title.includes(model.toLowerCase());
});

  // Step 3: Apply a scoring mechanism for relevance and price
  const scoredProducts = filteredProducts.map(product => {
      const title = product.title.toLowerCase();
      let score = 0;

      // Higher score if all search terms are present
      if (searchTerms.every(term => title.includes(term))) {
          score += 3;
      }

      // Additional score for terms appearing early in the title
      searchTerms.forEach((term, index) => {
          const position = title.indexOf(term);
          if (position !== -1) {
              score += 2 - (position / 100); // Adjust weighting as needed
          }
      });

      // Bonus for shorter titles that include all terms
    //   score += 1 / title.length;

      // Factor in price (lower price increases score)
      const price = parseFloat(product.price.replace(/[^0-9.-]+/g, "")); // Convert price to float
      score += 1 / price; // Higher score for lower price

      return { ...product, relevanceScore: score };
  });

  // Step 4: Sort by relevance score and return the top 5 products
  const topProducts = scoredProducts
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 7);

  // Step 5: Fallback to less strict matching if no products found
  if (topProducts.length === 0) {
      filteredProducts = products.filter(product => {
          const title = product.title.toLowerCase();
          return searchTerms.some(term => title.includes(term));
      });

      const fallbackScoredProducts = filteredProducts.map(product => {
          const title = product.title.toLowerCase();
          let score = 0;

          // Scoring as above but for the fallback case
          searchTerms.forEach(term => {
              if (title.includes(term)) {
                  score += 1;
              }
          });

          // Factor in price in the fallback scenario as well
          const price = parseFloat(product.price.replace(/[^0-9.-]+/g, ""));
          score += 1 / price;

          return { ...product, relevanceScore: score };
      });

      return fallbackScoredProducts
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, 5);
  }

  return topProducts;
}

export default filterAndAnalyzeProducts;

