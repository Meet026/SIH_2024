import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './db/index.js';
import dotenv from "dotenv";
import { fetchFlipkartProducts } from "./crawling/flipkart.js";
import { fetchAmazonProducts } from './crawling/amazone.js';
import { fetchIndiaMARTProducts } from './crawling/indiaMart.js';
import flash from 'connect-flash';
import session from 'express-session';
import filterAndAnalyzeProducts from './utils/Analysis.js';

dotenv.config({
  path: './.env'
})

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 5000;


app.use(session({
  secret: process.env.SESSION_SECRET, // Fetch the secret from environment variables
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true in production when using HTTPS
}));

app.use(flash());
// Flash middleware
app.use((req, res, next) => {
  res.locals.successMessages = req.flash('success');
  res.locals.errorMessages = req.flash('error');
 
  next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, "../public")))
app.use(express.urlencoded({ extended: true }));
app.use(express.json())

app.get('/home', (req, res) => {
  res.render('home/index.ejs');
});

app.get('/', (req,res) => {
  const errors = req.flash('errors')[0] || {};
  res.render('login/index.ejs',{ errors})
})

app.get('/register', (req,res) => {
  const errors = req.flash('errors')[0] || {};
  res.render('signup/index.ejs',{ errors})
})

app.post('/user/register', (req, res) => {
  const {email, username, password} = req.body;
  const errors = {};
  if (!username) {
    errors.username = 'Username is required.';
  }
  if (!password) {
    errors.password = 'Password is required.';
  }
  if (!email) {
    errors.email = 'Email is required';
  }

  if (Object.keys(errors).length > 0) {
    req.flash('errors', errors);
    return res.redirect('/register');
  }else {
    req.flash('success', "Sign up Succesfully");
    return res.redirect('/');
  }
});


app.post('/user/login', (req, res) => {
  const {email, password} = req.body;
  const errors = {};
 
  if (!password) {
    errors.password = 'Password is required.';
  }
  if (!email) {
    errors.email = 'Email is required';
  }

  if (Object.keys(errors).length > 0) {
    req.flash('errors', errors);
    return res.redirect('/');
  }else{
    req.flash('success', "Login up Succesfully");
    return res.redirect('/home');
  }
});

app.get('/modelofproduct', (req, res) => {
  // res.send('Welcome to the new page!');
  res.render('modelofproduct/index.ejs',{ products: [], error: null });
});

app.get('/modelofproduct2', (req, res) => {
  // res.send('Welcome to the new page!');
  res.render('modelofproduct2/index.ejs');
});

app.get('/modelofproduct3', (req, res) => {
  // res.send('Welcome to the new page!');
  res.render('modelofproduct3/index.ejs');
});


app.post('/modelofproduct/search', async (req, res) => {
  const { itemName, itemType, make, model } = req.body;

  if (!itemName || !itemType || !make || !model) {
     res.render('modelofproduct/index.ejs', { error: 'All fields are required', products: [] });
  }

  try {
    // Fetch products from both Amazon and Flipkart concurrently
    const [amazonProducts, flipkartProducts, indiaMartProducts] = await Promise.all([
      fetchAmazonProducts(itemName, make, model),
      fetchFlipkartProducts(itemName, make, model),
      fetchIndiaMARTProducts(itemName, make, model)
    ]);

    // Combine the product lists
    // let products = [...flipkartProducts, ...indiaMartProducts, ...amazonProducts];

    // products = filterAndAnalyzeProducts(itemName, make, model, products)

    // console.log("products after sentiment : ", products);

    
    res.redirect("/modelofproduct");
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