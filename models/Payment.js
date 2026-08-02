const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    scholarId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scholar', required: true },
    amount: { type: Number, required: true },
    purpose: { type: String, required: true },
    paymentDate: { type: Date, default: Date.now },
    status: { type: String, default: 'Pending' } // Pending, Completed, Failed
}, { timestamps: true });

paymentSchema.statics.getAll = function(status = null) {
    const filter = status ? { status } : {};
    return this.find(filter).populate('scholarId').sort({ createdAt: -1 });
};

paymentSchema.statics.approve = function(id) {
    return this.findByIdAndUpdate(id, { status: 'Completed' }, { new: true });
};

paymentSchema.statics.reject = function(id) {
    return this.findByIdAndUpdate(id, { status: 'Failed' }, { new: true });
};

module.exports = mongoose.model('Payment', paymentSchema);
