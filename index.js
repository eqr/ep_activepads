const eejs = require('ep_etherpad-lite/node/eejs')
const padManager = require('ep_etherpad-lite/node/db/PadManager')
const api = require('ep_etherpad-lite/node/db/API')
  ;

var pads = {
  pads: [],
  search: async function (query) {
    let the_pads = await padManager.listAllPads();
    return await pads._do_search(the_pads.padIDs, query);
  },
  _do_search: function (pads) {
    var data = {
      progress: 1
      , message: "Search done."
      , total: pads.length
    }
      , maxResult = 0
      , result = []
      ;

    result = pads;
    data.total = result.length;

    maxResult = result.length - 1;
    if (maxResult < 0) maxResult = 0;
    pads.pads = result;

    var entryset;
    data.results = [];

    result.forEach(function (value) {
      entryset = { padName: value, lastEdited: '', userCount: 0 };
      data.results.push(entryset);
    });

    if (data.results.length > 0) {
      data.results.forEach(function (value) {
        let resultObject = api.getLastEdited(value.padName);
        value.lastEdited = resultObject.lastEdited;
        resultObject = api.padUsersCount(value.padName);
        value.userCount = resultObject.padUsersCount;
      });
    } else {
      data.message = "No results";
    }
    return data;
  }
};

exports.registerRoute = async function (hook_name, args) {
  args.app.get('/admin/activepads', function (req, res) {
    var render_args = {
      errors: []
    };
    res.send(eejs.require("ep_activepads/templates/admin/activepads.html", render_args));
  });
};

var io = null;

exports.socketio = function (hook_name, args) {

  io = args.io.of("/pluginfw/admin/activepads");
  io.on('connection', function (socket) {
    socket.on("load", async function (query) {
      let result = await pads.search({pattern: "", offset: 0, limit: queryLimit});
      socket.emit("search-result", result);
    });

    socket.on("search", async function (query) {
      let result = await pads.search(query);
      socket.emit("search-result", result);
    });
  });
};

exports.eejsBlock_adminMenu = function (hook_name, args) {
  let hasAdminUrlPrefix = (args.content.indexOf("<a href=\"admin/") !== -1)
  , hasOneDirDown = (args.content.indexOf("<a href=\"../") !== -1)
  , hasTwoDirDown = (args.content.indexOf("<a href=\"../../") !== -1)
  , urlPrefix = hasAdminUrlPrefix ? "admin/" : hasTwoDirDown ? "../../" : hasOneDirDown ? "../" : ""
  ;

  args.content = args.content + "<li><a href=\"" + urlPrefix + "activepads\">Active Pads</a></li>";
};

exports.updatePads = function (hook_name, args, cb) {
  io.emit("progress", { progress: 1 });
};