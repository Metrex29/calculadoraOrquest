// Envoltorio del lector: la librería pide "spa.traineddata.gz". La página lo sirve como texto
// en base64 ("spa-traineddata-gz.b64.txt"), así que se intercepta esa petición, se decodifica
// y se entrega a la librería tal cual. Después se carga el lector normal.
(function(){
  var f=self.fetch.bind(self);
  self.fetch=function(u,o){
    var s=String(u&&u.url||u);
    if(!/spa\.traineddata(\.gz)?$/.test(s))return f(u,o);
    return f(new URL('lang/spa-traineddata-gz.b64.txt',self.location.href).href).then(function(r){
      if(!r.ok)return r;
      return r.text().then(function(t){
        var bin=atob(t.trim()),a=new Uint8Array(bin.length);
        for(var i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);
        return new Response(a,{status:200});
      });
    });
  };
  importScripts('worker.min.js');
})();
