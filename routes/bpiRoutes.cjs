const express = require("express");
const router = express.Router();
const { client } = require("../services.cjs");

/// CATALOG
const merchants = [
  {
    id: 1,
    name: "SM Gift Pass",
    category: "General",
    locations: 500,
    cities: ["Manila", "Cebu", "Davao"],
    provinces: ["Metro Manila", "Cebu", "Davao del Sur"],
    startingPrice: 100,
  },
  {
    id: 2,
    name: "The SM Store",
    category: "General",
    locations: 80,
    cities: ["Quezon City", "Pasig", "Bacolod"],
    provinces: ["Metro Manila", "Negros Occidental", "Iloilo"],
    startingPrice: 200,
  },
  {
    id: 3,
    name: "Power Mac Center",
    category: "Electronics",
    locations: 50,
    cities: ["Makati", "Cebu", "San Fernando"],
    provinces: ["Metro Manila", "Cebu", "Pampanga"],
    startingPrice: 5000,
  },
  {
    id: 4,
    name: "Krispy Kreme",
    category: "Cafe",
    locations: 100,
    cities: ["Manila", "Cebu", "Baguio"],
    provinces: ["Metro Manila", "Cebu", "Benguet"],
    startingPrice: 50,
  },
  {
    id: 5,
    name: "Jollibee",
    category: "Fast Food",
    locations: 1500,
    cities: ["Manila", "Cebu", "Iloilo"],
    provinces: ["Metro Manila", "Cebu", "Iloilo"],
    startingPrice: 100,
  },
  {
    id: 6,
    name: "Fully Booked",
    category: "Bookstore",
    locations: 30,
    cities: ["Taguig", "Cebu", "Batangas City"],
    provinces: ["Metro Manila", "Cebu", "Batangas"],
    startingPrice: 300,
  },
  {
    id: 7,
    name: "The Coffee Bean & Tea Leaf",
    category: "Cafe",
    locations: 100,
    cities: ["Manila", "Davao", "Baguio"],
    provinces: ["Metro Manila", "Davao del Sur", "Benguet"],
    startingPrice: 150,
  },
  {
    id: 8,
    name: "The Travel Club",
    category: "Specialty Store",
    locations: 20,
    cities: ["Makati", "Cebu", "San Pablo"],
    provinces: ["Metro Manila", "Cebu", "Laguna"],
    startingPrice: 2000,
  },
];

// Get all merchants
router.get("/bpi/merchants", async (req, res) => {
  setTimeout(() => {
    res.status(200).json(merchants);
  }, 3000);
});

// Get merchant by name
router.get("/bpi/merchants/:name", async (req, res) => {
  const { name } = req.params;
  const merchant = merchants.find(
    (merchant) => merchant.name.toLowerCase().replaceAll(" ", "-") === name,
  );

  if (!merchant) {
    return res.status(404).json({ error: "Merchant not found" });
  }

  setTimeout(() => {
    res.status(200).json(merchant);
  }, 3000);
});

/// ORDERS
// const orders = [
//   {
//     id: "ABCD1234",
//     merchant: "SM Gift Pass",
//     credits: 500,
//     quantity: 5,
//     amount: 2500,
//     date: "2025-02-15",
//     status: "Unredeemed",
//   },
//   {
//     id: "E5F6G7H8",
//     merchant: "Jollibee",
//     credits: 200,
//     quantity: 2,
//     amount: 400,
//     date: "2025-02-20",
//     status: "Unredeemed",
//   },
//   {
//     id: "I9J0K1L2",
//     merchant: "Power Mac Center",
//     credits: 5000,
//     quantity: 1,
//     amount: 5000,
//     date: "2025-02-25",
//     status: "Unredeemed",
//   },
// ];

// Get all orders
router.get("/bpi/orders", async (req, res) => {
  try {
    const orders = await client.query("SELECT * FROM bpi_orders");
    setTimeout(() => {
      res.status(200).json(orders.rows);
    }, 3000);
  } catch (error) {
    res.status(500).json({ error: error.stack });
  }
});

// Get order by ID
router.get("/bpi/orders/:id", async (req, res) => {
  const { id } = req.params;
  const result = await client.query("SELECT * FROM bpi_orders WHERE id = $1", [
    id,
  ]);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Order not found" });
  }

  setTimeout(() => {
    res.status(200).json(result.rows[0]);
  }, 3000);
});

// Add order
router.post("/bpi/orders", async (req, res) => {
  const { merchant, credits, quantity, amount, date, status } = req.body;

  if (!merchant || !credits || !quantity || !amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const order = {
    id: generateOrderId(),
    merchant,
    credits,
    quantity,
    amount,
    date: generateOrderDate(),
    status: "Unredeemed",
  };

  const query = `INSERT INTO bpi_orders (id, merchant, credits, quantity, amount, date, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
  const values = [
    order.id,
    order.merchant,
    order.credits,
    order.quantity,
    order.amount,
    order.date,
    order.status,
  ];

  try {
    const result = await client.query(query, values);
    const newOrder = result.rows[0];

    setTimeout(() => {
      res.status(201).json(newOrder);
    }, 3000);
  } catch (error) {
    res.status(500).json({ error: error.stack });
  }
});

function generateOrderId() {
  const orderId = crypto
    .randomUUID()
    .toUpperCase()
    .replaceAll("-", "")
    .slice(0, 8);
  return orderId;
}

function generateOrderDate() {
  return new Date().toISOString().split("T")[0];
}

module.exports = router;
