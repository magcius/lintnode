/* HTTP interface to JSLint.

   Takes roughly half the time to jslint something with this than to
   start up a new rhino instance on every invocation.
   
   Invoke from bash script like:
     curl --form source="<${1}" ${JSLINT_URL}
*/

var
  sys = require('sys'),
  http = require('http'),
  multipart = require('multipart'),
  JSLINT = require('./fulljslint');

var jslint_options = {
  bitwise: true,
  eqeqeq: true,
  immed: true,
  newcap: true,
  nomen: true,
  onevar: true,
  plusplus: true,
  regexp: true,
  rhino: true,
  undef: true,
  white: true,

  indent: 2,
  predef: ['$', 'window']
};

function formatErrors(errors) {
  var output = [], i, e;
  function write(s) {
    output.push(s + '\n');
  }

  for (i = 0; errors[i]; i++) {
    e = errors[i];
    write(e.line + ":" + e.character + ":" + e.reason);
  }
  return output.join('');
};

var server = http.createServer(function (req, res) {
  function malformed() {
    res.writeHeader(400, {"content-type": "text/plain"});
    res.close();
  }

  var 
    mp = multipart.parse(req),
    buf = [];

  if (req.headers.expect &&
      req.headers.expect.indexOf("100-continue") >= 0) {
    res.write("");
    res.write("HTTP/1.1 100 Continue\r\n\r\n");
  }

  mp.addListener("error", function (err) {
    malformed();
  });
  mp.addListener("partBegin", function (part) {
    if (part.name !== "source")
      malformed();
  });
  mp.addListener("body", function (chunk) {
    buf.push(chunk);
  });
  mp.addListener("complete", function () {
    var data = buf.join(""), lint;

    JSLINT.JSLINT(data, jslint_options);
    lint = formatErrors(JSLINT.JSLINT.errors);
    res.writeHead(200, {"Content-Type": "text/plain",
                        "Content-Length": lint.length});
    res.write(lint);
    res.close();
  });
})

server.listen(8000);
sys.puts("listening");
