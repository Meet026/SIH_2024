import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './db/index.js';
import dotenv from "dotenv";
import { fetchFlipkartProducts } from "./crawling/flipkart.js";
import { fetchAmazonProducts } from "./crawling/amazone.js";

dotenv.config({
  path: './.env'
})

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 5000;


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, "../public")))
app.use(express.urlencoded({ extended: true }));
app.use(express.json())

app.get('/', (req, res) => {
  res.render('home/index.ejs');
});

app.get('/login', (req,res) => {
  res.render('login/index.ejs')
})

app.get('/register', (req,res) => {
  res.render('signup/index.ejs',{ error : null})
})

app.post('/user/register', (req, res) => {

    res.redirect('/login')

});


app.post('/user/login', (req, res) => {

  res.redirect('/')

});

app.get('/modelofproduct', (req, res) => {
  // res.send('Welcome to the new page!');
  res.render('modelofproduct/index.ejs', { products: [], error: null });
});


app.post('/modelofproduct/search', async (req, res) => {
  const { itemName, itemType, make, model } = req.body;

  if (!itemName || !itemType || !make || !model) {
     res.render('modelofproduct/index.ejs', { error: 'All fields are required', products: [] });
  }

  try {
    // Fetch products from both Amazon and Flipkart concurrently
    const [amazonProducts, flipkartProducts] = await Promise.all([
      fetchAmazonProducts(itemName, make, model),
      fetchFlipkartProducts(itemName, make, model)
    ]);

    // Combine the product lists
    const products = [...amazonProducts, ...flipkartProducts];

    res.render('modelofproduct/index.ejs', { products, error: null });
  } catch (error) {
    console.error(error);
    res.render('modelofproduct/index.ejs', { error: 'An error occurred while fetching data', products: [] });
  }
});

// Route import
import userRouter from "../src/routes/user.routes.js"
app.use("/user", userRouter);


connectDB()
.then(() => {
  try {
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (error) {
      console.log("Error : ", error);
  }
})

