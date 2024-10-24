const express = require('express');
const router = express.Router();
const { client } = require('../services.cjs');

/// ORDERS
//> Get all orders
router.get('/orders', async (req, res) => {
	const ordersQuery = `SELECT * FROM orders`;

	try {
		const orders = await client.query(ordersQuery);
		res.status(200).json(orders.rows);
	} catch (error) {
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

//> Get
router.get('/orders/:user_id', async (req, res) => {
	const { user_id } = req.params;

	if (!user_id) res.status(400).json({ error: 'Missing required fields!' });

	const ordersQuery = `SELECT * FROM orders WHERE user_id = $1`;
	const ordersValues = [user_id];

	try {
		const ordersResult = await client.query(ordersQuery, ordersValues);
		const orders = ordersResult.rows;

		await processOrders(orders);

		res.json(orders);
	} catch (error) {
		res.status(500).json({ error: error.stack });
		console.error(error);
	}
});

async function processOrders(orders) {
	for (const order of orders) {
		delete order.user_id;

		const orderProductsQuery = `SELECT product_id, quantity FROM order_products WHERE reference_number = $1`;
		const orderProductsValues = [order.reference_number];

		const orderProductsResult = await client.query(
			orderProductsQuery,
			orderProductsValues
		);
		const orderProducts = orderProductsResult.rows;

		order.products = await getProducts(orderProducts);
	}
}

async function getProducts(orderProducts) {
	// Extract product IDs
	const productIds = orderProducts.map((item) => item.product_id);

	if (productIds.length === 0) {
		return []; // No products to fetch
	}

	// Construct the SQL query
	const productQuery = `SELECT * FROM products WHERE id = ANY($1)`;

	try {
		// Execute the query to get product info
		const productResult = await client.query(productQuery, [productIds]);
		const products = productResult.rows;

		// Create a map for easy access to product details by ID
		const productMap = products.reduce((acc, product) => {
			acc[product.id] = product;
			return acc;
		}, {});

		// Combine product info with quantities from the original orderProducts
		const orderWithProductInfo = orderProducts.map((item) => {
			const productInfo = productMap[item.product_id];
			return {
				...productInfo,
				quantity: item.quantity
			};
		});

		console.log(orderWithProductInfo);
		return orderWithProductInfo;
	} catch (error) {
		console.error('Error fetching product info:', error);
		throw new Error('Unable to fetch product info');
	}
}

//> Add
router.post('/orders/:user_id', async (req, res) => {
	const { user_id } = req.params;
	const { products } = req.body;

	if (!products) res.status(400).json({ error: 'Missing required fields!' });

	if (!Array.isArray(products)) {
		res.status(400).json({ error: 'Invalid product data!' });
		return;
	}

	if (products.length === 0) {
		res.status(400).json({ error: 'Invalid product data!' });
		return;
	}

	if (!products.every((product) => product.product_id && product.quantity)) {
		res.status(400).json({ error: 'Invalid product data!' });
	}

	const reference_number = await generateOrderReferenceNumber();

	const query =
		'INSERT INTO orders (user_id, reference_number, status) VALUES ($1, $2, $3) RETURNING *';
	const values = [user_id, reference_number, 'active'];

	try {
		await client.query(query, values);

		// Add the products to order_products table
		for (const product of products) {
			const query =
				'INSERT INTO order_products (reference_number, product_id, quantity) VALUES ($1, $2, $3)';
			const values = [reference_number, product.product_id, product.quantity];

			await client.query(query, values);
		}

		res
			.status(201)
			.json({ message: 'Order created successfully!', reference_number });
	} catch (error) {
		res.status(500).json({ error: error.stack });
		console.error(error);
	}
});

async function generateOrderReferenceNumber() {
	const prefix = 'ORD';
	const suffix = generateRandomUppercaseLetters();

	const query = "SELECT nextval('orders_id_seq')";

	try {
		const result = await client.query(query);
		const nextval = addZeroPadding(result.rows[0].nextval);

		return `${prefix}${nextval}${suffix}`;
	} catch (error) {
		console.error('Error generating order reference number:', error);
		throw new Error('Unable to generate order reference number');
	}
}

function addZeroPadding(number, totalDigits = 6) {
	// Convert the number to a string
	const numberStr = String(number);

	// Use padStart to add leading zeros
	const paddedNumber = numberStr.padStart(totalDigits, '0');

	return paddedNumber;
}

function generateRandomUppercaseLetters(amount = 2) {
	const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; // String of uppercase letters
	let result = '';

	// Generate random uppercase letters
	for (let i = 0; i < amount; i++) {
		const randomIndex = Math.floor(Math.random() * letters.length); // Get a random index
		result += letters[randomIndex]; // Append the random letter to the result
	}

	return result;
}

//> Update
router.put('/orders/:user_id', async (req, res) => {
	const { user_id } = req.params;
	const { reference_number } = req.body;

	if (!user_id || !reference_number) {
		return res.status(400).json({ error: 'Missing required fields!' });
	}

	try {
		const query =
			'UPDATE orders SET status = $3 WHERE user_id = $1 AND reference_number = $2';
		const values = [user_id, reference_number, 'completed'];

		await client.query(query, values);

		res.status(200).json({ message: 'Order status updated!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});
module.exports = router;
