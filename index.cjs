require('dotenv').config();

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const { Client } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const uuid = require('uuid');
const argon = require('argon2');
const firebase = require('firebase/app');
const { getStorage, put } = require('firebase/storage');

/// SETUP                                                                                                                      ///
app.use(cors());
app.use(bodyParser.json());

//> POSTGRESQL
const client = new Client({
	user: process.env.POSTGRES_USER,
	host: process.env.POSTGRES_HOST,
	database: process.env.POSTGRES_DATABASE,
	password: process.env.POSTGRES_PASSWORD,
	port: 5432,
	ssl: {
		rejectUnauthorized: true
	}
});

client
	.connect()
	.then(() => console.log('Connected to PostgreSQL'))
	.catch((err) => console.error('Connection error', err.stack));

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

/// GET USERS                                                                                                                  ///
app.get('/users', async (req, res) => {
	try {
		const rows = await client.query('SELECT * FROM users');
		res.status(200).json(rows.rows);
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

/// LOGIN                                                                                                                      ///
app.post('/login', async (req, res) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return res.status(400).json({ error: 'Missing required fields!' });
	}

	const query = 'SELECT password_hash FROM users WHERE email = $1';
	const values = [email];

	try {
		const { rows } = await client.query(query, values);

		if (!rows.length) {
			return res.status(401).json({ error: 'Invalid email or password!' });
		}

		const password_hash = rows[0].password_hash;
		const isPasswordCorrect = await argon.verify(password_hash, password);

		if (!isPasswordCorrect) {
			return res.status(401).json({ error: 'Invalid email or password!' });
		}

		res.status(200).json({ message: 'Login successful!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

/// SIGNUP                                                                                                                     ///
app.post('/register', async (req, res) => {
	const { first_name, last_name, email, password } = req.body;

	if (!first_name || !last_name || !email || !password) {
		return res.status(400).json({ error: 'Missing required fields!' });
	}

	// Check existing emails
	const query = 'SELECT * FROM users WHERE email = $1';
	const values = [email];

	try {
		const { rows } = await client.query(query, values);

		if (rows.length) {
			return res.status(400).json({ error: 'Email already exists!' });
		}

		// Insert to database
		const id = uuid.v4();
		const insertQuery = `INSERT INTO users (id, first_name, last_name, email, password) VALUES ($1, $2, $3, $4, $5)`;
		const insertValues = [id, first_name, last_name, email, password];

		await client.query(insertQuery, insertValues);

		res.status(201).json({ message: 'Registration successful!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

/// PRODUCTS                                                                                                                   ///
app.get('/products', async (req, res) => {
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
app.get('/products/:id', async (req, res) => {
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
app.post('/products', async (req, res) => {
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

	// Check existing product name
	const selectQuery = 'SELECT * FROM products WHERE name = $1';
	const selectValues = [name];

	try {
		const { rows } = await client.query(selectQuery, selectValues);

		if (rows.length) {
			return res.status(400).json({ error: 'Product name already exists!' });
		}
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}

	try {
		const query = `INSERT INTO products (name, description, category, price, stock_quantity, brand, dimensions, type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
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

		await client.query(query, values);

		res.status(201).json({ message: 'Product created!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

//> Delete by ID
app.delete('/products/:id', async (req, res) => {
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

/// CART                                                                                                                       ///
//> Get
app.get('/cart/:user_id', async (req, res) => {
	const { user_id } = req.params;
	const query = 'SELECT * FROM cart WHERE user_id = $1';
	const values = [user_id];

	try {
		const result = await client.query(query, values);
		res.status(200).json(result.rows);
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

//> Add
app.post('/cart/:user_id', async (req, res) => {
	const { user_id } = req.params;
	const { product_id, quantity } = req.body;

	if (!user_id || !product_id || !quantity) {
		return res.status(400).json({ error: 'Missing required fields!' });
	}

	try {
		const query =
			'INSERT INTO cart (user_id, product_id, quantity) VALUES ($1, $2, $3)';
		const values = [user_id, product_id, quantity];

		await client.query(query, values);

		res.status(201).json({ message: 'Product added to cart!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

//> Update
app.put('/cart/:user_id', async (req, res) => {
	const { user_id } = req.params;
	const { product_id, quantity } = req.body;

	if (!user_id || !product_id || !quantity) {
		return res.status(400).json({ error: 'Missing required fields!' });
	}

	try {
		const query =
			'UPDATE cart SET quantity = $3 WHERE user_id = $1 AND product_id = $2';
		const values = [user_id, product_id, quantity];

		await client.query(query, values);

		res.status(200).json({ message: 'Product quantity updated!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

//> Remove
app.delete('/cart/:user_id', async (req, res) => {
	const { user_id } = req.params;
	const { product_id } = req.body;

	if (!user_id || !product_id) {
		return res.status(400).json({ error: 'Missing required fields!' });
	}

	try {
		const query = 'DELETE FROM cart WHERE user_id = $1 AND product_id = $2';
		const values = [user_id, product_id];

		await client.query(query, values);

		res.status(200).json({ message: 'Product removed from cart!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

/// FAVORITES                                                                                                                  ///
//> Get
app.get('/favorites/:user_id', async (req, res) => {
	const { user_id } = req.params;
	const query = 'SELECT * FROM favorites WHERE user_id = $1';
	const values = [user_id];

	try {
		const result = await client.query(query, values);
		res.status(200).json(result.rows);
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

//> Add
app.post('/favorites/:user_id', async (req, res) => {
	const { user_id } = req.params;
	const { product_id } = req.body;

	if (!user_id || !product_id) {
		return res.status(400).json({ error: 'Missing required fields!' });
	}

	try {
		const query = 'INSERT INTO favorites (user_id, product_id) VALUES ($1, $2)';
		const values = [user_id, product_id];

		await client.query(query, values);

		res.status(201).json({ message: 'Product added to favorites!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

//> Remove
app.delete('/favorites/:user_id', async (req, res) => {
	const { user_id } = req.params;
	const { product_id } = req.body;

	if (!user_id || !product_id) {
		return res.status(400).json({ error: 'Missing required fields!' });
	}

	try {
		const query =
			'DELETE FROM favorites WHERE user_id = $1 AND product_id = $2';
		const values = [user_id, product_id];

		await client.query(query, values);

		res.status(200).json({ message: 'Product removed from favorites!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

/// PAYMENT INTENTS                                                                                                            ///
app.post('/payment-intents', async (req, res) => {
	const { user_id, payment_intent_id } = req.body;

	if (!user_id || !payment_intent_id) {
		return res.status(400).json({ error: 'Missing required fields!' });
	}

	try {
		const query =
			'INSERT INTO payment_intents (user_id, payment_intent_id) VALUES ($1, $2)';
		const values = [user_id, payment_intent_id];

		await client.query(query, values);

		res.status(201).json({ message: 'Payment intent created!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});

/// WEBHOOK                                                                                                                    ///
app.post('/webhook', async (req, res) => {
	const type = req.body.data.attributes.type;
	const payment_intent_id =
		req.body.data.attributes.data.attributes.payment_intent_id;
	const payment_id = req.body.data.attributes.data.id;

	if (type == 'payment.paid') {
		const searchQuery =
			'SELECT user_id FROM payment_intents WHERE payment_intent_id = $1';
		const searchValues = [payment_intent_id];

		try {
			const searchResult = await client.query(searchQuery, searchValues);
			const user_id = searchResult.rows[0].user_id;

			const query =
				'INSERT INTO payments (user_id, payment_intent_id, payment_id) VALUES ($1, $2, $3)';
			const values = [user_id, payment_intent_id, payment_id];

			await client.query(query, values);

			console.log('Payment successful!');
			res.status(200).json({ message: 'Payment successful!' });

			return;
		} catch (error) {
			console.log('Payment error!');
			res.status(500).json({ error: error.stack });

			return;
		}
	} else if (type == 'payment.failed') {
		console.log('Payment failed!');
		res.status(409).json({ message: 'Payment failed!' });

		return;
	}

	console.log('Unknown error occurred!');
	res.status(500).json({ message: 'Unknown error occurred!' });
});

/// IMAGE TEST                                                                                                                 ///
app.post('/image-test', upload.single('image'), async (req, res) => {
	const { image } = req.file;

	if (image) {
		const storageRef = storage.ref(`products/${file.name}`);

		try {
			await storageRef.put(file);

			// Get the download URL
			const url = await storageRef.getDownloadURL();

			// Send the URL to the client
			res.status(201).json({ message: 'Image uploaded successfully!', url });
		} catch (error) {
			res.status(500).json({ error: error.stack });
			console.error(error);
		}
	} else {
		res.status(400).json({ error: 'Missing required fields!' });
	}
});

/// RUN                                                                                                                        ///
app.get('/', (req, res) => {
	res.send('Server running...');
});

app.listen(port, () => {
	console.log(`Server is running on port ${port}...`);
});
