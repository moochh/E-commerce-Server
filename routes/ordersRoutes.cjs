const express = require('express');
const router = express.Router();
const { client } = require('../services.cjs');

/// ORDERS
//> Get all orders
router.get('/orders', async (req, res) => {
	const ordersQuery = `SELECT * FROM orders`;

	try {
		const ordersResult = await client.query(ordersQuery);
		const orders = ordersResult.rows;

		await processAllOrders(orders);

		res.status(200).json(orders);
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

async function processAllOrders(orders) {
	if (orders.length === 0) return;

	// Get all reference numbers
	const referenceNumbers = orders.map((order) => order.reference_number);

	// Get all order products in one query
	const orderProductsQuery = `
		SELECT reference_number, product_id, quantity 
		FROM order_products 
		WHERE reference_number = ANY($1)
	`;
	const orderProductsResult = await client.query(orderProductsQuery, [
		referenceNumbers
	]);
	const allOrderProducts = orderProductsResult.rows;

	// Group order products by reference number
	const orderProductsMap = allOrderProducts.reduce((acc, item) => {
		if (!acc[item.reference_number]) {
			acc[item.reference_number] = [];
		}
		acc[item.reference_number].push(item);
		return acc;
	}, {});

	// Get all unique product IDs
	const productIds = [
		...new Set(allOrderProducts.map((item) => item.product_id))
	];

	// Get all products info in one query
	const productsQuery = `SELECT * FROM products WHERE id = ANY($1)`;
	const productsResult = await client.query(productsQuery, [productIds]);
	const products = productsResult.rows;

	// Create products lookup map
	const productsMap = products.reduce((acc, product) => {
		acc[product.id] = product;
		return acc;
	}, {});

	// Combine all information
	for (const order of orders) {
		const orderProducts = orderProductsMap[order.reference_number] || [];
		order.products = orderProducts.map((item) => ({
			...productsMap[item.product_id],
			quantity: item.quantity
		}));
	}
}

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

	if (!products)
		return res.status(400).json({ error: 'Missing required fields!' });

	if (
		!Array.isArray(products) ||
		products.length === 0 ||
		!products.every((product) => product.product_id && product.quantity)
	) {
		return res.status(400).json({ error: 'Invalid product data!' });
	}

	try {
		// Insert the order and retrieve the ID
		const orderResult = await client.query(
			'INSERT INTO orders (user_id, status, reference_number) VALUES ($1, $2, $3) RETURNING id',
			[user_id, 'active', 'ref']
		);

		const orderId = orderResult.rows[0].id;

		// Generate the reference number using the current order ID
		const referenceNumber = generateOrderReferenceNumber(orderId);

		// Update the order with the generated reference number
		await client.query(
			'UPDATE orders SET reference_number = $1 WHERE id = $2',
			[referenceNumber, orderId]
		);

		// Add products to order_products table
		for (const product of products) {
			await client.query(
				'INSERT INTO order_products (reference_number, product_id, quantity) VALUES ($1, $2, $3)',
				[referenceNumber, product.product_id, product.quantity]
			);
		}

		res.status(201).json({
			message: 'Order created successfully!',
			id: orderId,
			reference_number: referenceNumber
		});
	} catch (error) {
		res.status(500).json({ error: error.stack });
		console.error(error);
	}
});

function generateOrderReferenceNumber(orderId) {
	const prefix = 'ORD';
	const suffix = generateRandomUppercaseLetters();
	const paddedId = addZeroPadding(orderId);

	return `${prefix}${paddedId}${suffix}`;
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
router.put('/orders/:reference_number', async (req, res) => {
	const { reference_number } = req.params;

	if (!reference_number) {
		return res.status(400).json({ error: 'Missing required fields!' });
	}

	try {
		const query = 'UPDATE orders SET status = $2 WHERE reference_number = $1';
		const values = [reference_number, 'completed'];

		await client.query(query, values);

		res.status(200).json({ message: 'Order status updated!' });
	} catch (error) {
		res.status(500).json({ error: error.stack });
	}
});
module.exports = router;
