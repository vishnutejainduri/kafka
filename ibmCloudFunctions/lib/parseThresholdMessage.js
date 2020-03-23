'use strict';

const TOPIC_NAME = 'thresholds-connect-jdbc';

// some js "reverse engineered" from some scala code that can be found in the thread here:
// https://github.com/confluentinc/kafka-connect-jdbc/issues/563
function convertToInteger(inputString) {
  const buffer = Buffer.from(inputString, 'base64'); //makes a buffer from the base64 string input
  const binaryString = buffer.toString('binary'); //convert buffer to binary string...

  const len = binaryString.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i); //gets unicode value of current decoded string character
  }

  let finalIntegerValue = 0;
  for (let i = 0; i < bytes.length; i++) {
    finalIntegerValue = (finalIntegerValue << 8) | bytes[i]; //bitwise operations... turn to integer with things
  }

  return finalIntegerValue;
}

function parseThresholdMessage(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse Threshold update messages');
    }

    return {
        skuId: msg.value.SKU_ID,
        threshold: Number.isInteger(msg.value.THRESHOLD) ? msg.value.THRESHOLD : convertToInteger(msg.value.THRESHOLD)
    };
}

module.exports = {
    parseThresholdMessage
};
