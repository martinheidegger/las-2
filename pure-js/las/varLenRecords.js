const varLenRecord = require('./varLen/varLenRecord')
const {iter} = require('../util/parser')
module.exports = (count, op, next) => iter(varLenRecord, count, op, next)
