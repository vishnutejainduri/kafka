'use strict';

const TOPIC_NAME = 'media-containers-connect-jdbc';

const APPROVED_APPROVAL_STATUS = 8796096954459;

// Map of source attribute names to mapped name. Non-translatable attribute names
// .CODE, p.P_GALLERYIMAGES, p.MODIFIEDTS FROM HARP.PRODUCTS p
const attributeMap = {
    'CODE': 'code',
    'P_GALLERYIMAGES': 'galleryImages',
    'P_APPROVALSTATUS': 'approvalStatus',
    'MODIFIEDTS': 'modifiedTs'
};

function filterMediaContainerMessage(msg) {
    if (msg.topic !== TOPIC_NAME) {
        throw new Error('Can only parse MEDAICONTAINER update messages');
    }

    // filter out unapproved items
    if (msg.value.P_APPROVALSTATUS !== APPROVED_APPROVAL_STATUS) {
        return false;
    }

    // filter out sku images (they have a style ID suffix greater than -00)
    const hasStyleSuffixGreaterThan00 = /^\d+-(1\d|0[1-9])$/;
    return !msg.value.CODE.match(hasStyleSuffixGreaterThan00);
}

// Parse a message from the HARP.MEDIACONTAINERS table and return new objects with filtered and re-mapped attributes.
// PLEASE NOTE that each message can generate 0-N rows to be inserted. See Media data transform docs.
// @returns Array
function parseMediaContainerMessage(msg) {
    // Re-map atttributes
    const mediaContainerData = {};
    for (let sourceAttributeName in attributeMap) {
        mediaContainerData[attributeMap[sourceAttributeName]] = msg.value[sourceAttributeName];
    }

    const mediaContainerIds = mediaContainerData.galleryImages
        ? mediaContainerData.galleryImages
            .replace(/\\,/g, ',')
            .split(',')
            .filter(id => id.match(/^\d+$/))
            .map(Number)
        : [];
    delete mediaContainerData.galleryImages;

    return mediaContainerIds
        .map((mediaContainerId) => Object.assign({}, mediaContainerData,
            {
                _id: mediaContainerId,
                id: mediaContainerId,
                mediaContainerId,
                isMain: mediaContainerId === mediaContainerIds[0]
            })
        );
}

module.exports = {
    parseMediaContainerMessage,
    filterMediaContainerMessage
};
