const expect = require('chai').expect;

const {APPROVED_APPROVAL_STATUS, filterMediaContainerMessage, parseMediaContainerMessage} = require('../lib/parseMediaContainerMessage');

const testData = {
    "key": null,
    "offset": 260001,
    "partition": 0,
    "topic": "media-containers-connect-jdbc",
    "value": {
        "CODE": "05711003",
        "P_GALLERYIMAGES": "\\,#1\\,8796756279346\\,8796756279347\\,",
        "P_APPROVALSTATUS": APPROVED_APPROVAL_STATUS,
        "MODIFIEDTS": "2013-09-11 04:24:14.190"
    }
};

describe('parseMediaContainerMessage', () => {
    it('should generate multiple output rows for galleryImages that reference multiple containers', () => {
        const actual = parseMediaContainerMessage(testData);
        expect(actual).to.have.length(2);
    });

    it('should designate the first gallery image as "isMain"', () => {
        const actual = parseMediaContainerMessage(testData);
        expect(actual[0].isMain).to.be.true;
    });

    it('should no output rows for null galleryImages', () => {
        const nullGalleryImages = Object.assign({}, testData);
        nullGalleryImages.value.P_GALLERYIMAGES = null;
        const actual = parseMediaContainerMessage(nullGalleryImages);
        expect(actual).to.have.length(0);
    });
});

describe('filterMediaContainerMessage', () => {
    it('should only work for messages about the relevant topic', () => {
        const wrongTopicMessage = {topic: 'foobar'};
        expect(filterMediaContainerMessage.bind(null, wrongTopicMessage)).to.throw('Can only parse MEDAICONTAINER update messages');
    });

    it('should filter out non-approved media containers', () => {
        const actual1 = [{
            topic: 'media-containers-connect-jdbc',
            value: {CODE: '1234-01', P_APPROVALSTATUS: 1234}
        }].filter(filterMediaContainerMessage);
        const actual2 = [{
            topic: 'media-containers-connect-jdbc',
            value: {CODE: '1234-00', P_APPROVALSTATUS: APPROVED_APPROVAL_STATUS}
        }].filter(filterMediaContainerMessage);

        expect(actual1).to.be.empty;
        expect(actual2).to.have.length(1);
    });

    it('should filter out "pseudo styles"', () => {
        const actual1 = [{
            topic: 'media-containers-connect-jdbc',
            value: {CODE: '1234-01', P_APPROVALSTATUS: APPROVED_APPROVAL_STATUS}
        }].filter(filterMediaContainerMessage);
        const actual2 = [{
            topic: 'media-containers-connect-jdbc',
            value: {CODE: '1234-11', P_APPROVALSTATUS: APPROVED_APPROVAL_STATUS}
        }].filter(filterMediaContainerMessage);
        const actual3 = [{
            topic: 'media-containers-connect-jdbc',
            value: {CODE: '1234-00', P_APPROVALSTATUS: APPROVED_APPROVAL_STATUS}
        }].filter(filterMediaContainerMessage);

        expect(actual1).to.be.empty;
        expect(actual2).to.be.empty;
        expect(actual3).to.have.length(1);
    });
})