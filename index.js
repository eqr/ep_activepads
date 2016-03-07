var eejs = require('ep_etherpad-lite/node/eejs')
  , padManager = require('ep_etherpad-lite/node/db/PadManager')
  , api = require('ep_etherpad-lite/node/db/API')
  , log4js = require('log4js')
  , logger = log4js.getLogger("plugin:activepads")
;

var pads={
  pads:[] ,
  search: function(query, callback){
    logger.debug("Admin/ActivePad search");
    logger.debug(padManager);
     padManager.listAllPads(function(null_value, the_pads) {
      logger.debug("inside list all pads")
      pads._do_search(the_pads.padIDs, query, callback);
    });
  },
  _do_search: function(pads, query, callback){
    logger.debug("Admin/ActivePad do search");
    var data={
        progress : 1
        , message: "Search done."
        , total: pads.length
      }
      , maxResult=0
      , result=[]
    ;
    
    result = pads;    
    data.total=result.length;
    logger.debug("total: " + data.total);
    maxResult=result.length-1;
    if(maxResult<0)maxResult=0;
    pads.pads=result;
    
    var entryset;
    data.results=[];
    
    result.forEach(function(value){
      entryset={padName:value, lastEdited:'', userCount:0};
      data.results.push(entryset);
    });
    
    var numOfQueries={
        count : data.results.length*2,
        inc : function(){return ++this.count;},
        dec : function(){return --this.count;},
        val : function(){return this.count;}
    };
    
    if(data.results.length > 0){
        data.results.forEach(function(value){
          api.getLastEdited(value.padName,function(err,resultObject){
              if(err==null){
                  value.lastEdited=resultObject.lastEdited;
              }
              if(numOfQueries.dec() <= 0){
                  callback(data);
              }
          })
          api.padUsersCount(value.padName,function(err,resultObject){
              if(err==null){
                  value.userCount=resultObject.padUsersCount;
              }
              if(numOfQueries.dec() <= 0){
                  callback(data);
              }
          });
        });
    }else{
      data.message = "No results";
      callback(data);
    }
  }
};

exports.registerRoute = function (hook_name, args, cb) {
  logger.debug("Admin/ActivePad register route");
  args.app.get('/admin/activepads', function(req, res) {    
    var render_args = {
      errors: []
    };
    res.send( eejs.require("ep_activepads/templates/admin/activepads.html", render_args) );
  });
};

var io = null;

exports.socketio = function (hook_name, args, cb) {
    logger.debug("Admin/ActivePad socket.io");
  io = args.io.of("/pluginfw/admin/activepads");
  io.on('connection', function (socket) {
    socket.on("load", function (query) {
      pads.search({pattern:''}, function (progress) {
        socket.emit("search-result", progress);
      });
    });

    socket.on("search", function (query) {
      logger.debug("Admin/ActivePad on search");
      pads.search(query, function (progress) {
        socket.emit("search-result", progress);
      });
    });
  });
};

exports.eejsBlock_adminMenu = function (hook_name, args, cb) {
  logger.debug("Admin/ActivePad admin menu");
  var hasAdminUrlPrefix = (args.content.indexOf('<a href="admin/') != -1)
    , hasOneDirDown = (args.content.indexOf('<a href="../') != -1)
    , hasTwoDirDown = (args.content.indexOf('<a href="../../') != -1)
    , urlPrefix = hasAdminUrlPrefix ? "admin/" : hasTwoDirDown ? "../../" : hasOneDirDown ? "../" : ""
  ;
  
  args.content = args.content + '<li><a href="'+ urlPrefix +'activepads">Active pads</a> </li>';
  return cb();
};

exports.updatePads=function(hook_name, args, cb){
  logger.debug("Admin/ActivePad update pads");
  io.emit("progress",{progress:1});
};