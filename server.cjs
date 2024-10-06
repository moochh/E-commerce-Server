require('dotenv').config();

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const cors = require('cors');
const bodyParser = require('body-parser');

//> Routes
const userRoutes = require('./routes/userRoutes.cjs');
const cartRoutes = require('./routes/cartRoutes.cjs');
const favoritesRoutes = require('./routes/favoritesRoutes.cjs');
const paymentsRoutes = require('./routes/paymentsRoutes.cjs');
const webhookRoutes = require('./routes/webhookRoutes.cjs');
const productsRoutes = require('./routes/productsRoutes.cjs');

/// SETUP                                                                                                                      ///
app.use(cors());
app.use(bodyParser.json());

/// ROUTES                                                                                                                     ///
app.use('/', userRoutes);
app.use('/', cartRoutes);
app.use('/', favoritesRoutes);
app.use('/', paymentsRoutes);
app.use('/', webhookRoutes);
app.use('/', productsRoutes);

/// RUN                                                                                                                        ///
app.get('/', (req, res) => {
	res.send('Server running...');
});

app.listen(port, () => {
	console.log(`Server is running on port ${port}...`);
});
