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
	const query = 'DELETE FROM products WHERE id = $1';
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
	const query = 'SELECT * FROM products';
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
			types['All'] = [[...types.All, ...categoryTypes]];
		}

		// Query to get types of featured products
		const featuredQuery = `SELECT DISTINCT type FROM products WHERE "IsFeatured" = true`;
		const featuredResult = await client.query(featuredQuery);

		// Extract featured types
		types.Featured = featuredResult.rows.map((item) => item.type);

		res.status(200).json(types);
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

//! DELETE ALL
router.delete('/delete-all/:product_id', async (req, res) => {
	const { product_id } = req.params;
	const deleteValues = [product_id];

	// Delete from tables cart, favorites, order_products
	const cartQuery = `DELETE FROM cart WHERE product_id = $1`;
	const favoritesQuery = `DELETE FROM favorites WHERE product_id = $1`;
	const orderProductsQuery = `DELETE FROM order_products WHERE product_id = $1`;

	try {
		await client.query(cartQuery, deleteValues);
		await client.query(favoritesQuery, deleteValues);
		await client.query(orderProductsQuery, deleteValues);

		res.status(200).json({ message: 'Product deleted!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

module.exports = router;
