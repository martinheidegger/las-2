const str = (size) => {
  return {
    size,
    parse: (buffer, start) => buffer.toString('ascii', start, start + size).replace(/\u0000*$/ig, '')
  }
}
const repeat = (type, amount) => {
  return {
    size: type.size * amount,
    parse: (buffer, start) => {
      const result = []
      for (let i = 0; i < amount; i++) {
        result[i] = type.parse(buffer, start)
        start += type.size
      }
      return result
    }
  }
}
const uLong = { size: 4, parse: (buffer, start) => buffer.readUInt32LE(start) }
const noop = {
  skip: true,
  size: Number.POSITIVE_INFINITY,
  parse: () => noop
}
module.exports = {
  str,
  repeat,
  short: { size: 2, parse: (buffer, start) => buffer.readInt16LE(start) },
  uShort: { size: 2, parse: (buffer, start) => buffer.readUInt16LE(start) },
  long: { size: 4, parse: (buffer, start) => buffer.readInt32LE(start) },
  uLong,
  double: { size: 8, parse: (buffer, start) => buffer.readDoubleLE(start) },
  uChar: { size: 1, parse: (buffer, start) => buffer.readInt8(start) },
  str4: str(4),
  str8: str(8),
  str16: str(16),
  str32: str(32),
  uLong5: repeat(uLong, 5),
  bitmap: (fields) => {
    const map = fields.reduce((map, entry) => {
      const {field} = entry
      map.push((result, i, flag) => { result[field] = flag })
      if (entry.size > 1) {
        map.push((result, i, flag) => { result[field] = result[field] | (flag << 1) })
      }
      if (entry.size > 2) {
        map.push((result, i, flag) => { result[field] = result[field] | (flag << 2) })
      }
      if (entry.size > 3) {
        throw new Error(`Currently max supported size is 3!`)
      }
      return map
    }, [])
    if (map.length % 8 !== 0) {
      throw new Error(`Bitmap only works on a multiple of 8`)
    }
    return {
      size: map.length / 8 | 0,
      parse: (buffer, start, result) => {
        const char = buffer.readInt8(start)
        if (result === undefined) {
          result = {}
        }
        for (let i = 0; i < 8; i++) {
          map[i](result, i, (char & i === 1))
        }
        return result
      }
    }
  },
  postProcess: (type, processor) => {
    return {
      size: type.size,
      parse: (buffer, start) => {
        return processor(type.parse(buffer, start))
      }
    }
  },
  iter: (type, total, op, next) => {
    let count = 0
    const nextCheck = () => {
      count += 1
      if (count < total) {
        return type(op, nextCheck)
      }
      return next
    }
    return type(op, nextCheck)
  },
  table: (fields) => {
    let firstNode
    let lastNode
    let result = {
      size: fields.reduce((total, {type}) => {
        return total + type.size
      }, 0),
      parse: (buffer, start) => {
        let node = firstNode
        const result = {}
        while (node) {
          const {type, field} = node
          if (field === '$') {
            type.parse(buffer, start, result)
          } else {
            result[field] = type.parse(buffer, start)
          }
          start += type.size
          node = node.next
        }
        return result
      }
    }

    fields.forEach((node) => {
      result.totalSize += node.type.size
      if (lastNode === undefined) {
        firstNode = node
      } else {
        lastNode.next = node
      }
      lastNode = node
    })

    return result
  },
  ignoreUntil: (targetOffset, next) => {
    return {
      skip: true,
      sizeFn: (totalOffset) => targetOffset - totalOffset,
      parse: (buffer, offset) => next
    }
  },
  noop,
  receiveBufferForFormat: (format) => {
    let current = format
    let currentSize
    let currentBuffer
    let currentBufferArr
    let requiredSize
    let previousOffset = 0

    const setRequiredSize = () => {
      if (current.size !== undefined) {
        currentSize = current.size
      } else {
        currentSize = current.sizeFn(previousOffset)
      }
      requiredSize = currentSize
    }

    setRequiredSize()
    const receiveBuffer = (buffer) => {
      requiredSize -= buffer.length
      if (requiredSize <= 0) {
        if (currentBufferArr) {
          currentBuffer = Buffer.concat(currentBufferArr)
        } else if (currentBuffer) {
          currentBuffer = Buffer.concat([currentBuffer, buffer])
        } else {
          currentBuffer = buffer
        }
        current = current.parse(currentBuffer, 0)
        previousOffset += currentSize
        // It is eigther a function or a parser object, if its a function
        // turn it into a parser: problem is in './parser#iter'
        if (current.parse === undefined) {
          current = current()
        }
        const leftOver = requiredSize
        setRequiredSize()
        currentBufferArr = undefined
        currentBuffer = undefined
        if (leftOver !== 0) {
          return buffer.slice(buffer.length + leftOver)
        }
        return
      }
      if (current.skip) {
        return
      }
      if (currentBufferArr !== undefined) {
        currentBufferArr.push(buffer)
      } else if (currentBuffer !== undefined) {
        currentBufferArr = [currentBuffer, buffer]
      } else {
        currentBuffer = buffer
      }
    }
    return (buffer) => {
      do {
        buffer = receiveBuffer(buffer)
      } while (buffer)
    }
  }
}
