const express = require('express');
const router = express.Router();
const { client } = require('../services.cjs');

/// PAYMENT INTENTS                                                                                                            ///
router.post('/payment-intents', async (req, res) => {
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

module.exports = router;
