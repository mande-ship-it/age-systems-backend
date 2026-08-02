const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    name: { type: String, unique: true, required: true },
    code: { type: String, unique: true },
    description: { type: String }
}, { timestamps: true });

departmentSchema.statics.getAll = function() {
    return this.find().sort({ name: 1 });
};

departmentSchema.statics.getAllWithCounts = async function() {
    const User = mongoose.model('User');
    const departments = await this.find().sort({ name: 1 });

    return Promise.all(departments.map(async (dept) => {
        const count = await User.countDocuments({ departmentId: dept._id });
        return {
            ...dept.toObject(),
            userCount: count
        };
    }));
};

departmentSchema.statics.getUsers = function(id) {
    const User = mongoose.model('User');
    return User.find({ departmentId: id }).sort({ fullName: 1 });
};

departmentSchema.statics.update = function(id, data) {
    return this.findByIdAndUpdate(id, data, { new: true });
};

departmentSchema.statics.delete = function(id) {
    return this.findByIdAndDelete(id);
};

// Virtuals for frontend compatibility
departmentSchema.virtual('id').get(function() {
    return this._id.toHexString();
});

departmentSchema.virtual('created_at').get(function() {
    return this.createdAt;
});

departmentSchema.set('toJSON', { virtuals: true });
departmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Department', departmentSchema);
