import { ObjectId } from 'mongodb';


export const processedRowObject1 = {
    "_id" : ObjectId("5b0577d0e0376d0045baf035"),
    "rowParams" : {
        "String" : "IAmEditedString2",
        "Number" : 2,
        "Date" : "2018-01-02T00:00:00.000Z"
    },
    "srcDocPKey" : "5b05779b35ad5f003c7ccf9c",
    "pKey" : "1",
    "createdAt" : "2018-05-23T14:17:04.481Z",
    "published" : true,
    "updatedAt" : "2018-05-23T14:17:04.481Z"
};

export const processedRowObject2 = {
    "_id" : ObjectId("5b0577d0e0376d0045baf036"),
    "rowParams" : {
        "Date" : "2018-01-03T00:00:00.000Z",
        "Number" : 3,
        "String" : "IAmString3"
    },
    "srcDocPKey" : "5b05779b35ad5f003c7ccf9c",
    "pKey" : "2"
};

export const processedRowObject3 = {
    "_id" : ObjectId("5b0577d0e0376d0045baf034"),
    "rowParams" : {
        "Date" : "2018-01-01T00:00:00.000Z",
        "Number" : 1,
        "String" : "IAmString1"
    },
    "srcDocPKey" : "5b05779b35ad5f003c7ccf9c",
    "pKey" : "0"
};
