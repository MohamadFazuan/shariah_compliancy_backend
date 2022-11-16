var mongoose = require('mongoose');

var docsSchema = new mongoose.Schema([
    {
        id: {
            type: Number
        },
        date: {
            type: String
        },
        pdate: {
            type: String
        },
        name: {
            type: String,
        },
        filename: {
            type: String,
        },
        status: {
            type: String,
        },
        contentType: {
            type: String
        },

        file:
        {
            data: Buffer,
        }
    }
]);

//Image is a model which has a schema imageSchema

module.exports = new mongoose.model('document', docsSchema);