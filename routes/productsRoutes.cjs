const express = require('express');
const router = express.Router();
const client = require('../services.cjs');
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

//> New Product
router.post('/products', upload.single('image'), async (req, res) => {
	const {
		name,
		description,
		category,
		price,
		stock_quantity,
		brand,
		dimensions,
		type
	} = req.body;

	const image = req.file;

	if (
		!name ||
		!description ||
		!category ||
		!price ||
		!stock_quantity ||
		!brand ||
		!dimensions ||
		!type
	) {
		return res.status(400).json({ error: 'Missing required fields!' });
	}

	if (!image) {
		return res.status(400).json({ error: 'No image uploaded!' });
	}

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
		const query = `INSERT INTO products (name, description, category, price, stock_quantity, brand, dimensions, type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`;
		const values = [
			name,
			description,
			category,
			price,
			stock_quantity,
			brand,
			dimensions,
			type
		];

		const result = await client.query(query, values);
		const newProductId = result.rows[0].id;

		// Upload image
		await uploadImage(image, newProductId);

		res.status(201).json({ message: 'Product created!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

async function uploadImage(image, id) {
	const storageRef = ref(storage, `products/${id}`);

	const fileBuffer = fs.readFileSync(image.path);

	await uploadBytes(storageRef, fileBuffer, { contentType: image.mimetype });

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

module.exports = router;
