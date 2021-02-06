import { ObjectId } from 'mongodb';


export const sharedPage1 = {
    "_id" : ObjectId("5af05bbf497f90062e8caeb9"),
    "pageType" : "array_view",
    "viewType" : "gallery",
    "dataset" : ObjectId("5a42c26e303770207ce8f83b"),
    "rowObjectId" : null,
    "queryString" : "",
    "other" : null,
    "dateCreated" : "2018-05-15T13:15:44.853Z",
    "__v" : 0
};

export const sharedPage2 = {
    "_id" : ObjectId("5af05bbf497f90062e8caeba"),
    "pageType" : "array_view",
    "viewType" : "gallery",
    "dataset" : ObjectId("5a42c26e303770207ce8f83b"),
    "rowObjectId" : null,
    "queryString" : "",
    "query": {
        "sortBy": "name"
    },
    "other" : null,
    "dateCreated" : "2018-05-15T13:15:44.853Z",
    "__v" : 0
};
