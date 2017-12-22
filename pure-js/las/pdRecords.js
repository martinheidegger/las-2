const {iter} = require('../util/parser')
module.exports = (format, count, op, next) => iter(format, count, op, next)
