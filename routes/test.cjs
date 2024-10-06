const express = require('express');
const router = express.Router();

// Sample product routes
router.get('/zzz', (req, res) => {
	res.send('Hello ZZZ');
});

router.get('/abc', (req, res) => {
	res.send('Hello ABC');
});

module.exports = router;
