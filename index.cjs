require('dotenv').config();

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const { Client } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const uuid = require('uuid');

/// SETUP                                                                                                                      ///
app.use(cors());
app.use(bodyParser.json());

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

	const query = 'SELECT * FROM users WHERE email = $1 AND password = $2';
	const values = [email, password];

	try {
		const { rows } = await client.query(query, values);

		if (!rows.length) {
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
	const query = 'SELECT * FROM products';

	try {
		const result = await client.query(query);
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
	const { name, description, category, price, stock_quantity } = req.body;

	if (!name || !description || !category || !price || !stock_quantity) {
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
		const query = `INSERT INTO products (name, description, category, price, stock_quantity) VALUES ($1, $2, $3, $4, $5)`;
		const values = [name, description, category, price, stock_quantity];

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
	console.log(req.body.data.attributes);

	if (type == 'checkout_session.payment.paid' || type == 'payment.paid') {
		const query = 'INSERT INTO payments (name) VALUES ($1)';
		const values = ['kim clores'];

		try {
			await client.query(query, values);
		} catch (error) {
			res.status(500).json({ error: error.stack });
		}

		res.status(200).json({ message: 'Payment successful!' });

		return;
	} else if (type == 'payment.failed') {
		res.status(409).json({ message: 'Payment failed!' });
	}

	res.status(400).json({ message: 'Invalid event type!' });
});

/// RUN                                                                                                                        ///
app.get('/', (req, res) => {
	res.send('Server running...');
});

app.listen(port, () => {
	console.log(`Server is running on port ${port}...`);
});
