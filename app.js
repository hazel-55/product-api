require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const Product = require('./models/Product');

const app = express();
app.use(express.json());
app.get('/health', async (req, res) => {
    try {
        await mongoose.connection.db.admin().ping();
        res.status(200).json({
            status: 'healthy',
            database: 'connected'
        });
    } catch (err) {
        res.status(503).json({
            status: 'unhealthy',
            database: 'disconnected'
        });
    }
});

const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;

if (!PORT || !MONGO_URI) {
    console.error('Thiếu PORT hoặc MONGO_URI trong file .env');
    process.exit(1);
}

// CREATE: Thêm sản phẩm
app.post('/api/products', async (req, res) => {
    const product = await Product.create(req.body);
    res.status(201).json(product);
});

// READ: Lấy tất cả sản phẩm
app.get('/api/products', async (req, res) => {
    const products = await Product.find().sort({ pid: 1 });
    res.json(products);
});

// READ: Lấy một sản phẩm theo pid
app.get('/api/products/:pid', async (req, res) => {
    const product = await Product.findOne({ pid: req.params.pid });

    if (!product) {
        return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    res.json(product);
});

// UPDATE: Thay thông tin sản phẩm theo pid
app.put('/api/products/:pid', async (req, res) => {
    const { pname, price, quantity } = req.body;

    const product = await Product.findOneAndReplace(
        { pid: req.params.pid },
        { pid: req.params.pid, pname, price, quantity },
        { returnDocument: 'after', runValidators: true }
    );

    if (!product) {
        return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    res.json(product);
});

// DELETE: Xóa sản phẩm theo pid
app.delete('/api/products/:pid', async (req, res) => {
    const product = await Product.findOneAndDelete({ pid: req.params.pid });

    if (!product) {
        return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    res.json({ message: 'Đã xóa sản phẩm', product });
});

// Trả lỗi dữ liệu rõ ràng thay vì để ứng dụng dừng
app.use((err, req, res, next) => {
    if (err.code === 11000) {
        return res.status(409).json({ message: 'pid đã tồn tại' });
    }

    if (err.name === 'ValidationError' || err.name === 'CastError') {
        return res.status(400).json({ message: err.message });
    }

    console.error(err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
});

async function start() {
    try {
        await mongoose.connect(MONGO_URI);
        await Product.init();

        console.log('Đã kết nối MongoDB');
        app.listen(PORT, () => {
            console.log(`API đang chạy tại http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Không thể khởi động API:', err.message);
        process.exit(1);
    }
}

start();