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
const uLong = { size: 4, parse: (buffer, start) => buffer.readUInt32LE(start, true) }
const noop = {
  skip: true,
  size: Number.POSITIVE_INFINITY,
  parse: () => noop
}
const bitmap = (fields) => {
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
      const char = buffer.readInt8(start, true)
      if (result === undefined) {
        result = {}
      }
      for (let i = 0; i < 8; i++) {
        map[i](result, i, (char & i === 1))
      }
      return result
    }
  }
}
module.exports = {
  str,
  repeat,
  short: { size: 2, parse: (buffer, start) => buffer.readInt16LE(start, true) },
  uShort: { size: 2, parse: (buffer, start) => buffer.readUInt16LE(start, true) },
  long: { size: 4, parse: (buffer, start) => buffer.readInt32LE(start, true) },
  uLong,
  double: { size: 8, parse: (buffer, start) => buffer.readDoubleLE(start, true) },
  uChar: { size: 1, parse: (buffer, start) => buffer.readInt8(start, true) },
  str4: str(4),
  str8: str(8),
  str16: str(16),
  str32: str(32),
  uLong5: repeat(uLong, 5),
  bitmap,
  postProcess: (type, processor) => {
    return {
      size: type.size,
      parse: (buffer, start) => {
        return processor(type.parse(buffer, start))
      }
    }
  },
  onDemand: (type, total, op, next) => {
    const stepSize = type.size
    const receiveParts = {
      stepSize,
      sizeMax: () => total,
      parse: (buffer, start) => {
        const received = (buffer.length - start) / stepSize | 0
        total -= received
        if (total < 0) {
          throw new Error('wtf, we received more than requested!!!')
        }
        op({
          total: received,
          read: (index) => type.parse(buffer, start + index * stepSize)
        })
        if (total === 0) {
          return next
        }
        return receiveParts
      }
    }
    return receiveParts
  },
  iter: (type, total, op, next) => {
    const nextCheck = () => {
      total -= 1
      if (total === -1) {
        return next
      }
      return nextType
    }
    const nextType = type(op, nextCheck)
    return nextCheck()
  },
  table: (fields) => {
    const propMap = {}
    let offset = 0
    fields.forEach((node) => {
      const offsetStore = offset
      if (node.field) {
        const type = node.type
        propMap[node.field] = (buffer, start) => type.parse(buffer, start + offsetStore)
        offset += type.size
      } else if (node.bitmap) {
        let cache
        const type = bitmap(node.bitmap)
        node.bitmap.forEach(field => {
          propMap[field] = (buffer, start) => {
            if (cache === undefined) {
              cache = type.parse(buffer, start + offsetStore)
            }
            return cache[field]
          }
        })
        offset += 1
      } else {
        throw new Error('Unsupported table type!')
      }
    })

    const result = {
      size: fields.reduce((total, {type}) => {
        if (type === undefined) {
          return 1 // bitmap!
        }
        return total + type.size
      }, 0),
      parse: (buffer, start) => {
        return {
          get: (field) => propMap[field](buffer, start),
          toJSON: () => {
            const result = {}
            Object.keys(propMap).forEach(field => {
              result[field] = propMap[field](buffer, start)
            })
            return result
          }
        }
      }
    }
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
