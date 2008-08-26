/*

  xTigerTrans : utilities.js

  Utility functions available in an xTigerUtils namespace

*/

var xTigerUtils = xTigerUtils ? xTigerUtils : {
	
	// Class 
	FileListAction : function () {
			this.status = 0;
			this.error = 'uncalled';
			this.list = null;
	},
	XMLDocLoader : function () {
			this.status = 0;
			this.error = 'uncalled';
			this.xmlDoc = null;
	},

	/*
		Return true if the running application has been started directly from the file system
	*/
	isLocalSession : function () {
		return (0 == document.location.href.indexOf('file://'));
	},

	/*
		Return a cross-browser xmlhttp request object
	*/
	getXHR : function () {
		var xhr;
		if (window.XMLHttpRequest) {
		   xhr=new XMLHttpRequest();
		} else if (window.ActiveXObject) {
		   xhr=new ActiveXObject("Microsoft.XMLHTTP");
		}
		if (xhr == null) {
		   alert("Your browser does not support XMLHTTPRequest.");
		}
		return xhr;				
	},	

	/*
		Return a cross-browser xml document  object
	*/
	getXMLDoc : function () {
		var xmlDoc;
		try { // Firefox, Mozilla, Opera, etc. : DOM Load/Save API partially implemented
			xmlDoc = document.implementation.createDocument("","",null); 
		} catch(e) {
			try { // Internet Explorer
					xmlDoc=new ActiveXObject("Microsoft.XMLDOM");
			}catch(e){
				alert(e.message);
			}
		}
		return xmlDoc
	},	
		
	/* Turn url into a effective url that can be used to load a resource file. 

	   Simply escapes url characters if the caller has been started from a local file, otherwise 
	   appends the proxy string so that the url is accessed through a proxy.
	 */
	makeURLForFile : function (url, proxy) {
		if ((xTigerUtils.isLocalSession()) || (url.indexOf('file://') == 0) || (url.indexOf('http://') == -1)) {
			return url;
		} else {
			return proxy + escape(url);
		}
	},
		
	/* Loads a file synchronously inside a DOM Document object
	
	   The file MUST be an XML file otherwise there will be no exception raised but the parsed document 
	   will correspond to a Mozilla's error message:
	   <parsererror xmlns="http://www.mozilla.org/newlayout/xml/parsererror.xml">...</parsererror>
	
		 Returns null if there was an error (after displaying an alert)
	*/
  loadXML : function (url) {
		var xmlDoc = xTigerUtils.getXMLDoc ();
		try {
			xmlDoc.async=false;
			xmlDoc.load(url);
		}catch(e) {
			alert("Error loading " + url + "\n" + e.message);
			return null;
		}	
		return xmlDoc;
	},

	/* Loads a file synchronously and returns its content as a string 
	*/
  loadText : function (url) {
		var xhr = xTigerUtils.getXHR ();
    var res;
    xhr.onreadystatechange  = function() { 								 //when the ajax request is ready, apply the following function
		  if(xhr.readyState  == 4) {													 //if it is ready
	      if((xhr.status  == 200) || (xhr.status  == 0)) {   //and document is found
					res = xhr.responseText;					//the value of the request(a string) is set in a variable
		    } else { 
          res = "Impossible to open document: ' + url + '. Error : " + xhr.status;
				}
      }
		}
		try {
   		xhr.open( "GET", url,  false); 												//we launch the ajax request
   		xhr.send(null); 																			//and send nothing
		} catch (e) {
			xhr.abort();
			res = "Error " + e;
		}
		return res;
	},
}

/*
   Loads a file with XHR and then tries to parse it as XML with DOMParser

   Initially I tried to implement it with getXMLDoc (document.implementation.createDocument)
	 See http://developer.mozilla.org/en/docs/DOM:document.load, but it didn't catch well errors
	
	 An alternative could be to use e4x	(http://developer.mozilla.org/en/docs/E4X) but currently
	 it is not possible to access it through a DOM object and the XML declaration must be discarded 
	 with a regexp
*/
xTigerUtils.XMLDocLoader.prototype = {	
	isInError : function () {
		return this.status != 1;		
	},
	getDocument : function () { 
		return this.xmlDoc;
	},
	load : function (url) {	
		var xhr = xTigerUtils.getXHR ();
		// expand closure...
		var owner = this;
		var src = url;
		// For synchronous requests we don't need this - see http://developer.mozilla.org/en/XMLHttpRequest		
		//     xhr.onreadystatechange  = function() {
		//   if(xhr.readyState  == 4) {
		// 	      if((xhr.status  == 200) || (xhr.status  == 0)) { // second test is for local usage -no Web server (from XHR MozDev doc)
		// 			owner.status = 1;
		//     } else { 
		//           owner.error = "Impossible to open document : '" + src + "'. Error : " + xhr.status;
		// 			owner.status = 0;
		// 		}
		//       }
		// }
		try {
   		xhr.open( "GET", url,  false);
   		xhr.send(null);
      if((xhr.status  == 200) || (xhr.status  == 0)) { // second test is for local usage -no Web server (from XHR MozDev doc)
				owner.status = 1;
	    } else { 
        owner.error = "Impossible to open document : '" + src + "'. Error : " + xhr.status;
				owner.status = 0;
			}
		} catch (e) {
			xhr.abort();
			this.error = "Impossible to open document : '" + url + "'. " + e;
			this.status = 0;
		}
		if (0 != this.status ) { // Parses result
			var d = null;
			if (xhr.responseXML) {
				d = xhr.responseXML; // MIME-Type was set to XML and doc could be parsed 			
			} else { // let's try to see if it can be parsed as XML
				// we do not tidify as we are expecting real XML ... but that could improve robustness...
				try {
				    var parser = new DOMParser();
				    d = parser.parseFromString(xhr.responseText, "text/xml");						
				} catch (e) {
					this.error = "The requested document is not pure XML : '" + url + "'. " + e;
					this.status = 0;
				}	
			}
			if (d) {
				if (d.documentElement.nodeName == "parsererror") {
					this.error = "The requested document is not pure XML : '" + url + "'. Error while parsing";
					this.status = 0;
				} else {
					this.xmlDoc = d;
				}
			}			
		}
	},	
}

xTigerUtils.FileListAction.prototype = {

	// Pre-defined data detectors and data filters to parse, extract and select which file names to return
	// Note that these are static methods because of the way they are called in "load"
	_localDirRegExp : new RegExp("\\s?([^\\s]*)\\s0.*DIRECTORY", "mgi"),  // regexp to match folder names 
	_localxTigerTmplRegExp : new RegExp("\\s?([^\\s]*\\.xtd)", "mgi"),
	_proxyDirRegExp : new RegExp('href\s?=[\'\"]([^\/]*)\/[\'\"]', "mgi"),  // regexp to match folder names 
	_proxyxTigerTmplRegExp : new RegExp('href\s?=[\'\"](.*\.xtd)[\'\"]', "mgi"),
	
	localSubFolderDetector : function () {
		return xTigerUtils.FileListAction.prototype._localDirRegExp;		
	},
	localxTigerTmplDetector : function () {
		return xTigerUtils.FileListAction.prototype._localxTigerTmplRegExp;  // regexp to match file names 		
	},
	proxySubFolderDetector : function () {
		return xTigerUtils.FileListAction.prototype._proxyDirRegExp;		
	},
	proxyxTigerTmplDetector : function () {
		return xTigerUtils.FileListAction.prototype._proxyxTigerTmplRegExp;  // regexp to match file names 		
	},
	subFolderFilter : function (name)	{
		return (name.length > 0) && (name.charAt(0) != '.'); // remove "hidden" folders such as ".svn" and "/"
	},
	xTigerTmplFilter : function (name) {
		return true;
	},

	// Core functions
	isInError : function () {
		return this.status != 1;		
	},
	isEmpty : function () {
		return this.isInError() || (this.list.length == 0);
	},
	getFiles : function () { 
		return this.list;
	},
	load : function (url, detector, filter) {
		var xhr = xTigerUtils.getXHR ();
		// closure for XHR callback
    var listing;
		var owner = this;
		var src = url;
		// For synchronous requests we don't need this - see http://developer.mozilla.org/en/XMLHttpRequest
		//     xhr.onreadystatechange  = function() {
		//   if(xhr.readyState  == 4) {
		// 	      if((xhr.status  == 200) || (xhr.status  == 0)) { // second test is for local usage -no Web server (from XHR MozDev doc)
		// 			listing = xhr.responseText;
		// 			owner.status = 1;
		//     } else { 
		//           owner.error = "Impossible to open folder : '" + src + "'. Error : " + xhr.status;
		// 			owner.status = 0;
		// 		}
		//       }
		// }
		try {
   		xhr.open( "GET", url,  false);
   		xhr.send(null);
      if((xhr.status  == 200) || (xhr.status  == 0)) { // second test is for local usage -no Web server (from XHR MozDev doc)
				listing = xhr.responseText;
				owner.status = 1;
	    } else { 
        owner.error = "Impossible to open folder : '" + src + "'. Error : " + xhr.status;
				owner.status = 0;
			}
		} catch (e) {
			xhr.abort();
			this.error = "Impossible to open folder : '" + url + "'. " + e;
			this.status = 0;
		}
		if (0 != this.status ) { // Parses result to extract file names
			this.list = new Array();
			var rext = detector();
			var m;
			while (null != (m = rext.exec(listing))) {
				if (filter(m[1]))
					this.list.push(m[1]);
			}
		}
  },
	loadSubFoldersFrom : function (url) { 
		if (xTigerUtils.isLocalSession()) {
			this.load(url, this.localSubFolderDetector, this.subFolderFilter) 
		} else {
			this.load(url, this.proxySubFolderDetector, this.subFolderFilter) 		
		}
	},
	loadxTigerTmplFrom : function (url) { 
		if (xTigerUtils.isLocalSession()) {		
			this.load(url, this.localxTigerTmplDetector, this.xTigerTmplFilter) 
		} else {
			this.load(url, this.proxyxTigerTmplDetector, this.xTigerTmplFilter) 		
		}
	},
}

