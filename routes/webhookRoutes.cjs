const express = require('express');
const router = express.Router();
const client = require('../services.cjs');

/// WEBHOOK                                                                                                                    ///
router.post('/webhook', async (req, res) => {
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

module.exports = router;
