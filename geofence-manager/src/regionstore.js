
var https = require('https');
var Cloudant = require('cloudant');

var regionStore = function () {
    //console.log ("started with conf " + JSON.stringify(conf)) ;
};
var projects = {} ;

regionStore.prototype.save = function (conf, project, data, callback) {
 
     if (projects [project] === undefined) {
         // make sure we have any project data from db 
         loadData(conf, project, function() {
             if (projects [project] === undefined ) {//no data -- empty or absent database
                 console.log("creating database: " + project + "_db")
                 var cloudant = Cloudant(conf.dbcred.url);
                 cloudant.db.create(project + "_db", function() {
                     saveData(conf, project, data, callback);
                 });
             }
             else
                saveData(conf, project, data, callback);
         });

     }
     else {
         saveData(conf, project, data, callback);
     }

}
function saveData(conf, project, data, callback) {
    var oldProjectData = {} ;
    var newProjectData = {} ;
    console.log('saving ' + data.length + " features for project " + project);
    if (projects [project] !== undefined)
       oldProjectData = projects[project]  ;

    var docs = data.map(doc => {
        delete oldProjectData[doc.id];
        newProjectData[doc.id] = doc ;
        doc._id = doc.id;
        delete doc.id;
        if (doc.properties !== undefined && doc.properties.rev !== undefined) {
            doc._rev = doc.properties.rev ;
            delete doc.properties.rev;
        }
        console.log("loading: " + doc._id);
        return doc;
    });

    for (oldDocId in oldProjectData) { // docs NOT in bulk load but in DB
        console.log("deleting: " + oldDocId)
        var oldDoc = oldProjectData[oldDocId];
        if (oldDoc.properties !== undefined && oldDoc.properties.rev !== undefined) {
            var deleteDoc = { _deleted: true };
            deleteDoc._rev = oldDoc.properties.rev;
            deleteDoc._id = oldDoc.id;
            console.log("delete doc: " + JSON.stringify(deleteDoc));
            docs.push(deleteDoc);
        }
    }
   console.log("bulk load: " + docs.length);
//   console.log("bulk load req: " + JSON.stringify(docs));

    var cloudant = Cloudant(conf.dbcred.url);
    var db = cloudant.db.use(project + "_db");
    db.bulk({ docs: docs }, function (e, d) {
        console.log("error: " + e);
        projects [project] = newProjectData ;
        if (e)
            callback (500, d);
        else {
        console.log('bulk success:' + d);
        callback(200, d);
        } 
    });
    console.log("bulk called");

}

regionStore.prototype.load = function (conf, project, callback) {
    console.log('loading data for project ' + project);
    loadData (conf, project, callback);
}

function loadData (conf, project, callback) {
    var cloudant = Cloudant(conf.dbcred.url);
    var db = cloudant.db.use(project + "_db");
    var projectData = {} ;

    db.list({ include_docs: true }, function (err, data) {
        console.log(err, data);
        var docs = [];
        if (data !== undefined && data.rows !== undefined) {
            docs = data.rows.reduce(function (result, item) {
                console.log(JSON.stringify(item.doc));
                if (item.doc.type === undefined || item.doc.type !== 'Feature')
                    return result;
                item.doc.id = item.doc._id;
                delete item.doc._id;
                if (item.doc.properties === undefined)
                    item.doc.properties = {};
                item.doc.properties.rev = item.doc._rev;
                result.push(item.doc);
                projectData[item.doc.id] = item.doc;
                return result
            }, []);

            projects[project] = projectData ;
        }
        if (err)
            callback (500, docs);
        else
            callback(200, docs);
    });

}
module.exports = regionStore;