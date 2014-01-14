var path = require('path'),
	sqlite3 = require('sqlite3').verbose(),
	db = new sqlite3.Database(path.join(__dirname, 'data.db'));

module.exports = db;
