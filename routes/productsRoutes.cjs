const express = require('express');
const router = express.Router();
const { client, validateRequiredFields } = require('../services.cjs');
const firebase = require('firebase/app');
const {
	getStorage,
	ref,
	getDownloadURL,
	uploadBytes
} = require('firebase/storage');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

/// SETUP                                                                                                                      ///
//> Firebase
const firebaseConfig = {
	apiKey: process.env.FIREBASE_API_KEY,
	authDomain: process.env.FIREBASE_AUTH_DOMAIN,
	projectId: process.env.FIREBASE_PROJECT_ID,
	storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.FIREBASE_APP_ID
};

firebase.initializeApp(firebaseConfig);

const storage = getStorage();

//> Multer
// Set up multer for file uploads
const multerStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'uploads/'); // Specify the folder for storing uploads
	},
	filename: (req, file, cb) => {
		cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to filename
	}
});

const upload = multer({ storage: multerStorage });

/// PRODUCTS                                                                                                                   ///
router.get('/products', async (req, res) => {
	const query = 'SELECT * FROM products WHERE is_visible = true';

	try {
		const result = await client.query(query);
		console.log(result);
		res.status(200).json(result.rows);
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

//> Get by ID
router.get('/products/:id', async (req, res) => {
	const { id } = req.params;
	const query = 'SELECT * FROM products WHERE id = $1';
	const values = [id];

	try {
		const result = await client.query(query, values);

		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'Product not found!' });
		}

		res.status(200).json(result.rows[0]);
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

//> Get by ID with is_in_cart & is_in_favorites
router.get('/products/:id/:user_id', async (req, res) => {
	const { id, user_id } = req.params;
	const query = 'SELECT * FROM products WHERE id = $1';
	const values = [id];

	try {
		const result = await client.query(query, values);

		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'Product not found!' });
		}

		const product = result.rows[0];

		// Check if product is in cart and favorites
		const cartQuery =
			'SELECT product_id FROM cart WHERE user_id = $1 AND product_id = $2';
		const favoritesQuery =
			'SELECT product_id FROM favorites WHERE user_id = $1 AND product_id = $2';

		const cartResult = await client.query(cartQuery, [user_id, id]);
		const favoritesResult = await client.query(favoritesQuery, [user_id, id]);

		// Check if product is in cart
		product.is_in_cart = cartResult.rows.length > 0;

		// Check if product is in favorites
		product.is_in_favorites = favoritesResult.rows.length > 0;

		res.status(200).json(product);
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

//> Get Products with is_in_cart & is_in_favoites
router.get('/user-products/:user_id', async (req, res) => {
	const { user_id } = req.params;

	// SQL queries for fetching all products and checking cart/favorites
	const productQuery = 'SELECT * FROM products';
	const cartQuery = 'SELECT product_id FROM cart WHERE user_id = $1';
	const favoritesQuery = 'SELECT product_id FROM favorites WHERE user_id = $1';

	try {
		// Fetch all products
		const productResult = await client.query(productQuery);
		const products = productResult.rows;

		// Fetch products in cart and favorites
		const cartResult = await client.query(cartQuery, [user_id]);
		const cartProducts = cartResult.rows.map((item) =>
			parseInt(item.product_id)
		);

		const favoritesResult = await client.query(favoritesQuery, [user_id]);
		const favoriteProducts = favoritesResult.rows.map((item) =>
			parseInt(item.product_id)
		);

		// Add is_in_cart and is_in_favorites properties to each product
		const enrichedProducts = products.map((product) => ({
			...product,
			is_in_cart: cartProducts.includes(product.id), // true if product is in cart
			is_in_favorites: favoriteProducts.includes(product.id) // true if product is in favorites
		}));

		// Send the enriched products back to the client
		res.status(200).json(enrichedProducts);
	} catch (error) {
		console.error('Error fetching products:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
});

//> Set Product Image
router.put('/product-image', async (req, res) => {
	const { product_id, image_url } = req.body;

	const requiredFields = ['product_id', 'image_url'];

	const validationError = validateRequiredFields(req.body, requiredFields);
	if (validationError) return res.status(400).json({ error: validationError });

	const query = `UPDATE products SET image_url = $1 WHERE id = $2`;
	const values = [image_url, product_id];

	try {
		await client.query(query, values);
		res.status(200).json({ message: 'Product image updated!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

//> New Product
router.post('/products', async (req, res) => {
	const {
		name,
		short_description,
		long_description,
		category,
		price,
		stock_quantity,
		brand,
		dimensions,
		type
	} = req.body;

	const requiredFields = [
		'name',
		'short_description',
		'long_description',
		'category',
		'price',
		'stock_quantity',
		'brand',
		'dimensions',
		'type'
	];

	const validationError = validateRequiredFields(req.body, requiredFields);
	if (validationError) return res.status(400).json({ error: validationError });

	// Check existing product name
	const selectQuery = 'SELECT * FROM products WHERE name = $1';
	const selectValues = [name];

	try {
		const { rows } = await client.query(selectQuery, selectValues);

		if (rows.length > 0) {
			return res.status(400).json({ error: 'Product name already exists!' });
		}
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}

	try {
		const query = `INSERT INTO products (name, short_description, long_description, category, price, stock_quantity, brand, dimensions, type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`;
		const values = [
			name,
			short_description,
			long_description,
			category,
			price,
			stock_quantity,
			brand,
			dimensions,
			type
		];

		const result = await client.query(query, values);
		const newProductId = result.rows[0].id;

		console.log(typeof newProductId);

		res
			.status(201)
			.json({ message: 'Product created!', product_id: newProductId });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

async function uploadImage(image, id) {
	const storageRef = ref(storage, `products/${id}`);

	const fileBuffer = fs.readFileSync(image.path);

	await uploadBytes(storageRef, fileBuffer, { contentType: image.mimetype });
	const url = await getDownloadURL(storageRef);

	const query = `UPDATE products SET image_url = $1 WHERE id = $2`;
	const values = [url, id];

	try {
		await client.query(query, values);
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}

	fs.unlinkSync(image.path);
}

//> Delete by ID
router.delete('/products/:id', async (req, res) => {
	const { id } = req.params;
	const query = 'UPDATE products SET is_visible = false WHERE id = $1';
	const values = [id];

	try {
		await client.query(query, values);
		res.status(200).json({ message: 'Product deleted!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

//> Product Types
router.get('/product-types', async (req, res) => {
	const categories = [
		'Living Room',
		'Kitchen',
		'Dining Room',
		'Bedroom',
		'Bathroom',
		'Outdoor'
	];

	try {
		const types = new Object();
		types['All'] = [];

		// Get types for each category
		for (const category of categories) {
			const categoryQuery = `SELECT DISTINCT type FROM products WHERE category = $1`;
			const categoryValues = [category];

			const categoryResult = await client.query(categoryQuery, categoryValues);
			const categoryTypes = categoryResult.rows.map((item) => item.type);

			types[category] = categoryTypes;
			types['All'] = [...types.All, ...categoryTypes];
		}

		// Query to get types of featured products
		const featuredQuery = `SELECT DISTINCT type FROM products WHERE "is_featured" = true`;
		const featuredResult = await client.query(featuredQuery);

		// Extract featured types
		types.Featured = featuredResult.rows.map((item) => item.type);

		res.status(200).json(types);
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

//> Update Product
router.patch('/products/:id', async (req, res) => {
	const { id } = req.params;
	const {
		name,
		short_description,
		long_description,
		category,
		price,
		stock_quantity,
		brand,
		dimensions,
		type,
		is_featured
	} = req.body;

	// Build the dynamic query
	let query = 'UPDATE products SET ';
	const values = [];
	let setClause = [];

	if (name) {
		values.push(name);
		setClause.push(`name = $${values.length}`);
	}
	if (short_description) {
		values.push(short_description);
		setClause.push(`short_description = $${values.length}`);
	}
	if (long_description) {
		values.push(long_description);
		setClause.push(`long_description = $${values.length}`);
	}
	if (category) {
		values.push(category);
		setClause.push(`category = $${values.length}`);
	}
	if (price) {
		values.push(price);
		setClause.push(`price = $${values.length}`);
	}
	if (stock_quantity !== undefined) {
		values.push(stock_quantity);
		setClause.push(`stock_quantity = $${values.length}`);
	}
	if (brand) {
		values.push(brand);
		setClause.push(`brand = $${values.length}`);
	}
	if (dimensions) {
		values.push(dimensions);
		setClause.push(`dimensions = $${values.length}`);
	}
	if (type) {
		values.push(type);
		setClause.push(`type = $${values.length}`);
	}
	if (is_featured !== undefined) {
		values.push(is_featured);
		setClause.push(`is_featured = $${values.length}`);
	}

	if (setClause.length === 0) {
		return res.status(400).json({ error: 'No fields to update' });
	}

	query += setClause.join(', ');
	query += ` WHERE id = $${values.length + 1} RETURNING *`;
	values.push(id);

	try {
		const result = await client.query(query, values);
		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'Product not found' });
		}
		res.status(200).json(result.rows[0]);
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

//! DELETE ALL
router.delete('/delete-all/:product_id', async (req, res) => {
	const { product_id } = req.params;
	const deleteValues = [product_id];

	// Delete from tables cart, favorites, order_products
	const productsQuery = `DELETE FROM products WHERE id = $1`;
	const cartQuery = `DELETE FROM cart WHERE product_id = $1`;
	const favoritesQuery = `DELETE FROM favorites WHERE product_id = $1`;
	const orderProductsQuery = `DELETE FROM order_products WHERE product_id = $1`;

	try {
		await client.query(cartQuery, deleteValues);
		await client.query(favoritesQuery, deleteValues);
		await client.query(orderProductsQuery, deleteValues);
		await client.query(productsQuery, deleteValues);

		res.status(200).json({ message: 'Product deleted!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

module.exports = router;
