var http = require("http");

module.exports = function(name,list){
    var obj = {};
    obj[name] = list;
    var postData = JSON.stringify(obj);
 
    var options = {
      hostname: '123.206.50.83',
      port: 5000,
      path: '/api/v1.0/maptask/post/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
     
    var req = http.request(options, (res) => {
      console.log(`STATUS: ${res.statusCode}`);
      console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
      });
      res.on('end', () => {
        console.log('No more data in response.');
      });
    });
     
    req.on('error', (e) => {
      console.log(`problem with request: ${e.message}`);
    });
     
    // write data to request body
    req.write(postData);
    req.end();
}
    