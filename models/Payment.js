const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    scholarId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scholar', required: true },
    amount: { type: Number, required: true },
    purpose: { type: String, required: true },
    paymentDate: { type: Date, default: Date.now },
    status: { type: String, default: 'Pending' }, // Pending, Completed, Failed
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

module.exports = mongoose.model('Payment', paymentSchema);
