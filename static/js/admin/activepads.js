exports.documentReady=function(hooks, context, cb){
  
  if(context != 'admin/activepads') return cb;
  
  var socket,
  loc = document.location,
  port = loc.port == "" ? (loc.protocol == "https:" ? 443 : 80) : loc.port,
  url = loc.protocol + "//" + loc.hostname + ":" + port + "/",
  pathComponents = location.pathname.split('/'),
  // Strip admin/plugins
  baseURL = pathComponents.slice(0,pathComponents.length-2).join('/') + '/',
  resource = baseURL.substring(1) + "socket.io";

  var room = url + "pluginfw/admin/activepads";
  socket = io.connect(room, {path: baseURL + "socket.io", resource : resource});

  var doUpdate = false;
  var search = function () {
    socket.emit("search", $('.search-results'));    
  };

  var isInt=function(input){
    return typeof input === 'number' && input % 1 == 0;
  };
  
  var formatDate=function(longtime){
    var formattedDate='';
    if(longtime!=null && isInt(longtime)){
        var date=new Date(longtime);
        var month=date.getMonth()+1;
        formattedDate=date.getFullYear()+'-'+fillZeros(month)+'-'+fillZeros(date.getDate())+' '+fillZeros(date.getHours())+':'+fillZeros(date.getMinutes())+':'+fillZeros(date.getSeconds());
    }
    return formattedDate;
  };
  
  var fillZeros=function(fillForm){
    return isInt(fillForm) ? ( fillForm < 10 ? '0' + fillForm : fillForm) : '';
  };
  
  function updateHandlers() {
    $("#progress.dialog .close").unbind('click').click(function () {
      $("#progress.dialog").hide();
    });
  }

  updateHandlers();

  socket.on('progress', function (data) {
    $("#progress .close").hide();
    $("#progress").show();

    $('#progress').data('progress', data.progress);

    var message = "Unknown status";
    if (data.message) {
      message = "<span class='status'>" + data.message.toString() + "</span>";
    }
    if (data.error) {
      message = "<span class='error'>" + data.error.toString() + "<span>";            
    }
    $("#progress .message").html(message);

    if (data.progress >= 1) {
      if (data.error) {
        $("#progress").show();
      } else {
        if (doUpdate) {
          doUpdate = false;
          search();
        }
        $("#progress").hide();
      }
    }
  });

  socket.on('search-result', function (data) {
    var widget=$(".search-results")
    widget.data('query', data.query);
    widget.data('total', data.total);

    widget.find(".results *").remove();
    var resultList=widget.find('.results');
    console.log(resultList);
    if(data.results.length > 0){
      data.results.forEach(function(resultset) {
        var padName=resultset.padName;
        var lastEdited=resultset.lastEdited;
        var userCount=resultset.userCount;
        if (!userCount) return false;
        var row = widget.find(".template tr").clone();
        row.find(".padname").html('<a href="../p/'+padName+'">'+padName+'</a>');
        row.find(".last-edited").html(formatDate(lastEdited));
        row.find(".user-count").html(userCount);
        resultList.append(row);
      });
    }else{
      resultList.append('<tr><td colspan="4" class="no-results">No results</td></tr>');
    }

    updateHandlers();
  });

  socket.emit("load");
  search();
  return cb;
};
