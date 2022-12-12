var express = require('express')
var app = express()
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var multer = require('multer');
var imgModel = require('./imgModel');
const docsModel = require('./docsModel');
var fs = require('fs');
var path = require('path');
var cors = require('cors');
var axios = require('axios');
var { jsPDF } = require('jspdf');
const { application } = require('express');
require('dotenv/config');

app.use(cors());

mongoose.connect(process.env.MONGO_URL,
    { useNewUrlParser: true, useUnifiedTopology: true }, err => {
        if (err) {
            console.log(err);
        }
        console.log("Mongo Connected");
    });

const dbConnection = mongoose.connection;
dbConnection.on("error", (err) => console.log(`Connection error ${err}`));
dbConnection.once("open", () => console.log("Connected to DB!"));

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// Set EJS as templating engine 
app.set("view engine", "ejs");

var storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now())
    }
});

var upload = multer({ storage: storage });

app.post('/docs', upload.single('file'), (req, res, next) => {

    // if (req.files.length > 5) {
    //     res.status(400).send("Too Many Files Upload")
    // } else {
    // console.log('single backend', req.body);
    var obj = {
        id: req.body.id,
        date: new Date().toJSON().slice(0, 10).replace(/-/g, '/'),
        pdate: "-",
        name: req.body.name,
        filename: req.file.filename,
        status: req.body.status,
        contentType: req.body.contentType,
        file: {
            data: fs.readFileSync(path.join(__dirname, '/uploads/' + req.file.filename)),
        }
    }
    docsModel.create(obj, (err, item) => {
        if (err) {
            console.log(err);
        }
        else {
            item.save().then((data) => {
                res.status(200).json({
                    status: 200,
                    result: data
                })
            });

        }
    });
    // }
});

app.post('/multidocs', upload.array('file', 10), (req, res, next) => {

    if (req.files.length > 10) {
        res.status(400).send("Too Many Files Upload")
    } else {
        var obj = [];
        // console.log('file length', req.files.length);
        // console.log('file length', req.body);
        for (var i = 0; i < req.files.length; i++) {
            obj.push({
                id: req.body.id[i],
                date: new Date().toJSON().slice(0, 10).replace(/-/g, '/'),
                pdate: "-",
                name: req.body.name[i],
                filename: req.files[i].filename,
                status: req.body.status[i],
                contentType: req.body.contentType[i],
                file: {
                    data: fs.readFileSync(path.join(__dirname, '/uploads/' + req.files[i].filename)),
                }
            });
        }
        // console.log('obj', obj);

        docsModel.create(obj, (err, item) => {
            if (err) {
                console.log(err);
            }
            else {
                res.status(200).json({
                    status: 200,
                    result: item
                })
            }
        });
    }
});

app.get('/docs', (req, res, next) => {
    let docs = [];
    docsModel.find({}).then(async (data) => {

        for (var i = 0; i < data.length; i++) {

            const updateId = await docsModel.updateOne({ id: data[i].id }, { id: i + 1 });
            docs.push(data[i]);
        }


        res.status(200).send(docs);
    })
});

app.post('/docs/id', (req, res, next) => {
    let docs = [];
    docsModel.find(req.body).then((data) => {
        data.forEach(element => {
            console.log(element);
            docs.push(element)
        });
        res.status(200).send(docs);
    })
});

app.get('/counter', (req, res, next) => {
    let docs = [];
    docsModel.find(req.body).then((data) => {
        data.forEach(element => {
            docs.push(element)
        });
        res.status(200).send(docs);
    })
});

app.post('/statusUpdate', (req, res, next) => {
    docsModel.find(req.body).then((data) => {
        data.map((element) => {
            if (element.status == "new") {
                docsModel.findOneAndUpdate(req.body, { status: "processed", pdate: new Date().toJSON().slice(0, 10).replace(/-/g, '/') }, (err, result) => {
                    if (err) {
                        res.status(400).send(err)
                    } else {
                        const buf = Buffer.from(result.file.data);

                        axios(`http://178.128.127.151:8000/api?inp=${buf.toString()}`, {
                            method: "GET",
                            headers: {
                                "Accept": "application/json",
                                "Content-Type": "application/json"
                            }
                        }).then(async (results) => {
                            var x = JSON.stringify(results.data);
                            if (fs.existsSync(path.join(__dirname + '/output/output-' + result.filename))) {
                                fs.writeFileSync(path.join(__dirname + '/output/output-' + result.filename), x, 'utf-8');
                            } else {
                                if (fs.existsSync(path.join(__dirname + '/output/'))) {
                                    fs.open(path.join(__dirname + '/output/output-' + result.filename), (err) => {

                                        fs.writeFileSync(path.join(__dirname + '/output/output-' + result.filename), x, 'utf-8');
                                    });
                                } else {
                                    fs.mkdirSync(path.join(__dirname + '/output'));
                                    fs.open(path.join(__dirname + '/output/output-' + result.filename), (err) => {

                                        fs.writeFileSync(path.join(__dirname + '/output/output-' + result.filename), x, 'utf-8');
                                    });
                                }
                            }
                        })
                        console.log('statusUpdate', result);
                        res.status(200).send(result);
                    }
                })
            } else if (element.status == "processed") {
                docsModel.findOneAndUpdate(req.body, { status: "reprocessed", pdate: new Date().toJSON().slice(0, 10).replace(/-/g, '/') }, (err, result) => {
                    if (err) {
                        res.status(400).send(err)
                    } else {
                        const buf = Buffer.from(result.file.data);

                        axios(`http://4.240.82.150:8000/api?inp=${buf.toString()}`, {
                            method: "GET",
                            headers: {
                                "Accept": "application/json",
                                "Content-Type": "application/json"
                            }
                        }).then(async (results) => {
                            var x = JSON.stringify(results.data);
                            if (fs.existsSync(path.join(__dirname + '/output/output-' + result.filename))) {
                                fs.writeFileSync(path.join(__dirname + '/output/output-' + result.filename), x, 'utf-8');
                            } else {
                                if (fs.existsSync(path.join(__dirname + '/output/'))) {
                                    fs.open(path.join(__dirname + '/output/output-' + result.filename), (err) => {

                                        fs.writeFileSync(path.join(__dirname + '/output/output-' + result.filename), x, 'utf-8');
                                    });
                                } else {
                                    fs.mkdirSync(path.join(__dirname + '/output'));
                                    fs.open(path.join(__dirname + '/output/output-' + result.filename), (err) => {

                                        fs.writeFileSync(path.join(__dirname + '/output/output-' + result.filename), x, 'utf-8');
                                    });
                                }
                            }
                        })
                        console.log('statusUpdate', result);
                        res.status(200).send(result);
                    }
                })
            }
        });
    })
});

app.post('/delete', (req, res, next) => {
    docsModel.findOneAndDelete(req.body).then((data) => {
        fs.unlinkSync(path.join(__dirname, '/uploads/' + data.filename));

        if (fs.existsSync(path.join(__dirname, '/output/output-' + data.filename))) {
            fs.unlinkSync(path.join(__dirname, '/output/output-' + data.filename));
        }

        res.status(200).send("Deleted");
    });
});

app.post('/view', async (req, res, next) => {
    docsModel.find(req.body).then((data) => {
        data.map(element => {
            var output = fs.readFileSync(path.join(__dirname + '/output/output-' + element.filename));
            res.status(200).send(output);
        });
    })
});

var port = process.env.PORT || '3000'
app.listen(port, err => {
    if (err)
        throw err
    console.log('Server listening on port', port)
})