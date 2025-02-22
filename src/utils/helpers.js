import isNaN from 'lodash.isnan'

/**
Copyright 2019 Jack Baker

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

export const toHex = function (i) {
  return '0x' + parseInt(i).toString(16).padStart(8, '0')
}

// This function controls how values are displayed to the user
// This could be improved, but as is all integers > 0x1000 are
// displayed as hex
export const formatValue = function (value, memType) {
  switch (memType) {
    case 'i8':
    case 'i16':
    case 'i32':
    case 'i64':
      return formatInteger(value)
    case 'f32':
    case 'f64':
      return value
    default:
      throw new Error('Invalid memory type ' + type + ' in formatValue()')
  }
}

export const formatInteger = function (value) {
  if (value > 0x1000) {
    return toHex(value)
  }

  return value
}

// TODO Move to extension class
export const sendContentMessage = function (type, msgBody) {
  const msg = {
    type: type,
    body: msgBody,
  }

  chrome.tabs.query({ active: true }, function (tabs) {
    if (tabs.length !== 0) {
      try {
        const activeTab = tabs[0]
        chrome.tabs.sendMessage(activeTab.id, msg)
      } catch (e) {
        // TODO Handle tab closed
        return
      }
    } else {
      console.log('tabs empty')
    }
  })
}

const storageSet = function (valueObj) {
  chrome.storage.local.set(valueObj)
}

const storageGet = function (key, callback) {
  chrome.storage.local.get(key, callback)
}

export const isValidMemType = function (memType) {
  switch (memType) {
    case 'i8':
    case 'i16':
    case 'i32':
    case 'f32':
    case 'i64':
    case 'f64':
    case 'ascii':
    case 'utf-8':
    case 'bytes':
      return true
    default:
      return false
  }
}

export const getElementSize = function (type) {
  let indexSize

  switch (type) {
    case 'i8':
    case 'ascii':
    case 'bytes':
      indexSize = 1
      break
    case 'i16':
    case 'utf-8':
      indexSize = 2
      break
    case 'i32':
      indexSize = 4
      break
    case 'i64':
      indexSize = 8
      break
    case 'f32':
      indexSize = 4
      break
    case 'f64':
      indexSize = 8
      break
    default:
      throw new Error('Invalid memory type ' + type + ' in getElementSize()')
  }

  return indexSize
}

// Converts the index into a TypedArray into the "real" memory address
// For example, index 0x1000 into the Int32Array translates to address 0x4000
// (0x1000 * sizeof(Int32))
export const indexToRealAddress = function (memIndex, memType) {
  const memSize = getElementSize(memType)

  return memIndex * memSize
}

export const realAddressToIndex = function (memAddr, memType) {
  const memSize = getElementSize(memType)

  return Math.floor(memAddr / memSize)
}

// Converts a value to its float32 representation so it can more easily
// be handled from within WASM.
export const convertToI32 = function (value, type) {
  switch (type) {
    case 'i8':
    case 'i16':
    case 'i32':
      return value
    case 'f32':
      const floatArray = new Float32Array([value])
      const i32Array = new Uint32Array(floatArray.buffer)

      return i32Array[0]
    case 'i64':
    case 'f64':
    default:
      throw new Error('Conversion ' + type + ' not implemented in convertToI32()')
  }
}

// https://stackoverflow.com/questions/3665115/how-to-create-a-file-in-memory-for-user-to-download-but-not-through-server
const downloadText = function (filename, text) {
  const anchorElement = document.createElement('a')
  anchorElement.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
  anchorElement.setAttribute('download', filename)

  anchorElement.style.display = 'none'
  document.body.appendChild(anchorElement)

  anchorElement.click()

  document.body.removeChild(anchorElement)
}

// BigInt capable JSON handlers from
// https://golb.hplar.ch/2018/09/javascript-bigint.html
export const bigintJsonParse = function (jsonString) {
  return JSON.parse(jsonString, (key, value) => {
    if (typeof value === 'string' && /^\d+n$/.test(value)) {
      return BigInt(value.slice(0, -1))
    }
    return value
  })
}

export const bigintJsonStringify = function (jsonObject) {
  return JSON.stringify(jsonObject, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString() + 'n'
    } else {
      return value
    }
  })
}

export const bigintIsNaN = function (value) {
  if (typeof value === 'bigint') {
    return false
  }

  return isNaN(value)
}

export const colorLog = function (msg) {
  console.log(
    '%c %c \u{1f419} CETUS %c %c ' + msg + ' %c %c',
    'background: #858585; padding:5px 0;',
    'color: #FFFFFF; background: #000000; padding:5px 0;',
    'background: #858585; padding:5px 0;',
    'color: #FFFFFF; background: #464646; padding:5px 0;',
    'background: #858585; padding:5px 0;',
    'color: #ff2424; background: #fff; padding:5px 0;'
  )
}

export const sendExtensionMessage = function (type, msg) {
  const msgBody = {
    type: type,
    body: msg,
  }

  const evt = new CustomEvent('cetusMsgIn', { detail: bigintJsonStringify(msgBody) })

  window.dispatchEvent(evt)
}

export const getMemoryType = function (memType) {
  switch (memType) {
    case 'i8':
    case 'ascii':
    case 'bytes':
      return Uint8Array
    case 'i16':
    case 'utf-8':
      return Uint16Array
    case 'i32':
      return Uint32Array
    case 'i64':
      return BigInt64Array
    case 'f32':
      return Float32Array
    case 'f64':
      return Float64Array
    default:
      throw new Error('Invalid memory type ' + memType + ' in getMemoryType()')
  }
}
